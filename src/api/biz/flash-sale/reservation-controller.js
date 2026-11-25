import crypto from "crypto";
import FlashSale from "../../models/flashSale";
import Order from "../../models/order";
import ManageQueue from "../../models/manageQueue";
import { response } from "../../../services/response";
import { cleanObjectBodymen, normalizePhone } from "../../../utils/common";
import {
  isReservationHolding,
  releaseSlot,
  reserveSlot,
  RESERVE_RESULT,
} from "../../../services/redis/flash-sale-scripts";

const RESERVE_MESSAGE = {
  [RESERVE_RESULT.SOLD_OUT]: "Đã hết suất",
  [RESERVE_RESULT.OVER_LIMIT]: "Bạn đã đạt giới hạn mua",
  [RESERVE_RESULT.NOT_OPEN]: "Chương trình chưa mở hoặc đã kết thúc",
  [RESERVE_RESULT.NOT_READY]: "Chương trình không tồn tại",
};

/**
 * Mua 1 suất flash-sale. Chỉ request thắng Lua mới chạm Mongo, còn lại chỉ tốn 1 lần eval Redis.
 * Đơn hàng được tạo bất đồng bộ qua ManageQueue → client poll `reservationStatus`.
 */
export const buy = async (req, res, next) => {
  const {
    biz,
    params: { id: saleId },
    bodymen: { body },
  } = req;
  const { qty, ...orderInfo } = cleanObjectBodymen(body);

  if (!Number.isInteger(qty)) {
    return response(res, { status: 400, message: "Số lượng phải là số nguyên" });
  }

  const buyer = normalizePhone(orderInfo.customer?.phone);
  if (!buyer) {
    return response(res, { status: 400, message: "Số điện thoại không hợp lệ" });
  }
  orderInfo.customer.phone = buyer;

  // Ngẫu nhiên (không dùng ObjectId) để không đoán được reservationId của người khác
  const reservationId = crypto.randomBytes(16).toString("hex");
  try {
    const result = await reserveSlot({
      saleId,
      bizId: biz.id,
      buyer,
      qty,
      reservationId,
    });
    if (result < 0) {
      return response(res, { status: 409, message: RESERVE_MESSAGE[result] });
    }

    try {
      const sale = await FlashSale.findOne({ _id: saleId, bizId: biz.id });
      if (!sale) throw new Error(`FlashSale ${saleId} not found in Mongo`);

      await ManageQueue.create([
        {
          name: "FLASH_SALE_CREATE_ORDER",
          worker: "FLASH_SALE_CREATE_ORDER",
          uniqueCode: `FS_ORDER_${reservationId}`,
          bizId: biz.id,
          schedule: new Date(),
          priority: 1,
          data: { saleId, reservationId, qty, orderInfo, bizId: biz.id },
        },
        {
          name: "FLASH_SALE_EXPIRE",
          worker: "FLASH_SALE_EXPIRE",
          uniqueCode: `FS_EXPIRE_${reservationId}`,
          bizId: biz.id,
          schedule: new Date(Date.now() + sale.holdMinutes * 60000),
          data: { saleId, reservationId, bizId: biz.id },
        },
      ]);
    } catch (error) {
      // Suất đã trừ trong Redis, không hoàn thì bị kẹt
      await releaseSlot({ saleId, reservationId }).catch(() => {});
      throw error;
    }

    return response(res, {
      status: 202,
      statusText: "ACCEPTED",
      data: { reservationId },
    });
  } catch (error) {
    return next(error);
  }
};

/** PROCESSING (đang giữ, chờ tạo đơn) | CREATED (+order) | EXPIRED (đã hoàn suất) */
export const reservationStatus = async (req, res, next) => {
  const {
    biz,
    params: { id: saleId, reservationId },
  } = req;

  try {
    const order = await Order.findOne({
      bizId: biz.id,
      "flashSale.id": saleId,
      "flashSale.reservationId": reservationId,
    });
    if (order) {
      return response(res, {
        data: { status: "CREATED", order: order.view(true) },
      });
    }

    const holding = await isReservationHolding({ saleId, reservationId });
    return response(res, {
      data: { status: holding ? "PROCESSING" : "EXPIRED" },
    });
  } catch (error) {
    return next(error);
  }
};
