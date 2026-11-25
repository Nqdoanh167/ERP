import mongoose from "mongoose";
import FlashSale from "../../models/flashSale";
import Order from "../../models/order";
import { ORDER_STATUS } from "../order/constants";
import { response } from "../../../services/response";
import { removeServiceCache } from "../../../services/cache";
import { syncOrderToElastic } from "../../../services/elastic/order";
import {
  confirmSlot,
  getFlashSaleStock,
  isReservationReleased,
  warmUpFlashSale,
} from "../../../services/redis/flash-sale-scripts";

const validateSale = (body) => {
  if (+body.endAt <= +body.startAt)
    return "Thời gian kết thúc phải sau thời gian bắt đầu";
  // Stock trong Redis dùng DECRBY → bắt buộc số nguyên
  if (!Number.isInteger(body.quantity) || !Number.isInteger(body.limitPerUser))
    return "Số suất và giới hạn mua phải là số nguyên";
  // bodymen không validate field lồng trong `item`
  const { item } = body;
  if (!item?.product || !(item.price > 0))
    return "Thiếu sản phẩm hoặc giá flash-sale không hợp lệ";
  if (item.originalPrice && item.price > item.originalPrice)
    return "Giá flash-sale không được lớn hơn giá gốc";
  return null;
};

export const create = async (req, res, next) => {
  const {
    biz,
    bodymen: { body },
  } = req;

  try {
    const invalidMessage = validateSale(body);
    if (invalidMessage) {
      return response(res, { status: 400, message: invalidMessage });
    }

    // MVP: không cho sửa sale sau khi tạo, muốn đổi thì tạo sale mới
    const sale = await FlashSale.create({ ...body, bizId: biz.id });
    try {
      await warmUpFlashSale(sale);
    } catch (error) {
      // Không nạp được Redis thì sale không bán được → xoá để không để lại sale "chết"
      await FlashSale.deleteOne({ _id: sale._id }).catch(() => {});
      throw error;
    }

    return response(res, {
      status: 201,
      data: { ...sale.view(true), stock: sale.quantity },
    });
  } catch (error) {
    return next(error);
  }
};

export const show = async (req, res, next) => {
  const { biz, params } = req;

  try {
    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return response(res, { status: 404, message: "Flash-sale không tồn tại" });
    }
    const sale = await FlashSale.findOne({ _id: params.id, bizId: biz.id });
    if (!sale) {
      return response(res, { status: 404, message: "Flash-sale không tồn tại" });
    }

    const stock = await getFlashSaleStock(sale.id);
    return response(res, { data: { ...sale.view(true), stock } });
  } catch (error) {
    return next(error);
  }
};

/**
 * Xác nhận thanh toán cho 1 suất đang giữ (nhân viên / webhook thanh toán gọi).
 * Thanh toán và job hết hạn tranh nhau xoá resv trong Redis → chỉ 1 bên thắng.
 */
export const confirmPaid = async (req, res, next) => {
  const {
    biz,
    viewer,
    params: { id: saleId, reservationId },
  } = req;

  try {
    // Chỉ cho thanh toán khi đơn đã tạo, nếu không worker tạo đơn sẽ thấy resv mất và bỏ qua → mất đơn
    const order = await Order.findOne({
      bizId: biz.id,
      "flashSale.id": saleId,
      "flashSale.reservationId": reservationId,
    });
    if (!order) {
      return response(res, {
        status: 409,
        message: "Đơn hàng đang được tạo, vui lòng thử lại sau",
      });
    }
    if (order.isPaid) return response(res, { data: order.view(true) });
    if (![ORDER_STATUS.NEW, ORDER_STATUS.PENDING].includes(order.status)) {
      return response(res, {
        status: 409,
        message: "Đơn hàng đã huỷ hoặc không còn ở trạng thái chờ thanh toán",
      });
    }

    const confirmed = await confirmSlot({ saleId, reservationId });
    // confirmed = 0 mà chưa bị hoàn → lần gọi trước đã chốt nhưng lưu Mongo lỗi → cho đi tiếp
    if (!confirmed && (await isReservationReleased({ saleId, reservationId }))) {
      return response(res, { status: 409, message: "Suất đã hết hạn giữ" });
    }

    const updatedOrder = await Object.assign(order, {
      isPaid: true,
      updatedBy: {
        id: viewer?.id,
        name: viewer?.name,
        email: viewer?.email,
        picture: viewer?.picture,
      },
    }).save();
    await syncOrderToElastic(updatedOrder);
    await removeServiceCache({ req, model: "order" });

    return response(res, { data: updatedOrder.view(true) });
  } catch (error) {
    return next(error);
  }
};
