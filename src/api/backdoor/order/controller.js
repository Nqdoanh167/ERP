import { delCache, getCache, setCache } from "../../../services/cache";
import { rejectBackdoor, resolveBackdoor } from "../../../services/response";
import { cleanObjectBodymen, retry } from "../../../utils/common";
import { bodyValidator, queryValidator } from "../../../utils/validation";
import {
  applyPromotions,
  buildCartItems,
  getCustomer,
  getInfoLocation,
  handleCouponChanges,
  handleOrderData,
} from "../../biz/order/helper";
import Order, { orderCreateModel } from "../../models/order";
import Biz from "../../../services/axios/biz";
import { ORDER_STATUS_CONFIG, ORDER_TYPE } from "../../biz/order/constants";
import PromotionService from "../../../services/axios/promotion";

export const findOne = async (queryParams) => {
  let result = {};
  try {
    const queryModel = {
      bizId: { type: String, required: true },
      id: { type: String, paths: ["_id"], required: true },
      status: { type: String },
      q: { type: String },
      branch_in: { type: [String], paths: ["branch.id"] },
      createdAt_gte: { type: Date, paths: ["createdAt"], operator: "gte" },
      createdAt_lte: { type: Date, paths: ["createdAt"], operator: "lte" },
    };

    const handlerValidator = await queryValidator(
      queryParams.query,
      queryModel
    );
    if (!handlerValidator.valid) {
      return rejectBackdoor({
        queryParams,
        status: 422,
        statusText: "BAD_USER_INPUT",
        data: handlerValidator,
      });
    }

    const {
      querymen: { query, select },
    } = handlerValidator;
    // get cache
    const cache = await getCache({
      model: "order",
      queryParams: query,
      alias: query.bizId,
    });

    if (cache) return resolveBackdoor({ queryParams, data: cache });

    const order = await Order.findOne(query);
    if (!order) {
      return rejectBackdoor({
        queryParams,
        status: 404,
        statusText: "NOT_FOUND",
        message: "Order not found",
      });
    }

    result.data = order.view(true);

    await setCache({
      modal: "order",
      alias: query.bizId,
      data: result,
      queryParams: query,
    });

    result = resolveBackdoor({ queryParams, data: result });
  } catch (error) {
    result.status = 500;
    result.message = error.toString();
    result = resolveBackdoor({ queryParams, data: result });
  }

  return result;
};

export const findMany = async (queryParams) => {
  let result = {};
  try {
    const queryModel = {
      bizId: { type: String, required: true },
      id: { type: String, paths: ["_id"] },
      ids: { type: [String], paths: ["_id"] },
    };

    const handlerValidator = await queryValidator(
      queryParams.query,
      queryModel
    );

    if (!handlerValidator.valid) {
      return rejectBackdoor({
        queryParams,
        status: 422,
        statusText: "BAD_USER_INPUT",
        data: handlerValidator,
      });
    }

    const {
      querymen: { query, select, cursor },
    } = handlerValidator;

    // get cache
    const cache = await getCache({
      model: "order",
      queryParams: query,
      alias: query.bizId,
    });

    if (cache) return resolveBackdoor({ queryParams, data: cache });

    const total = await Order.countDocuments(query);
    result.total = total;
    result.data = [];

    if (total) {
      const data = await Order.find(query, select, cursor);
      result.data = data.map((item) => item.view(true));
    }

    // save cache
    await setCache({
      model: "order",
      alias: query.bizId,
      data: result.data,
      queryParams: query,
    });
    result = resolveBackdoor({ queryParams, data: result });
  } catch (error) {
    result.status = 500;
    result.message = error.toString();
    result = resolveBackdoor({ queryParams, data: result });
  }

  return result;
};

export const addOne = async (bodyParams) => {
  let result = {};
  try {
    const handlerValidator = await bodyValidator(bodyParams.data, {
      bizId: { type: String, required: true },
      ...orderCreateModel,
      updatedBy: {
        id: String,
        name: String,
        email: String,
        picture: String,
      },
    });

    if (!handlerValidator.valid) {
      return rejectBackdoor({
        bodyParams,
        status: 422,
        statusText: "BAD_USER_INPUT",
        data: handlerValidator,
      });
    }

    const { body } = handlerValidator;
    const biz = await Biz.findById_byCache(body.bizId);
    if (!biz) {
      return rejectBackdoor({
        bodyParams,
        message: "Không tìm thấy Biz!",
        status: 403,
        statusText: "BIZ_NOT_FOUND",
      });
    }

    cleanObjectBodymen(body);

    await handleOrderData({ body, biz });

    const newOrder = await retry(async () => {
      // Tạo code
      const lastOrder = await Order.findOne({ bizId: biz.id }).sort({
        nid: -1,
      });
      body.nid = (lastOrder?.nid || 0) + 1;
      body.code = "DH" + body.nid.toString().padStart(5, "0");
      body.uniqueCode = `${biz.id}_${body.code}`;

      return await Order.create({
        ...body,
        bizId: biz.id,
        author: body.updatedBy?.id,
      });
    });

    result.data = newOrder.view(true);
    result = resolveBackdoor({ bodyParams, data: result });

    //Cập nhật lại trạng thái mã khuyến mãi
    const coupons = result.data.coupons || [];
    const customerId = result.data.customer?.id;
    for (const coupon of coupons) {
      if (coupon.code) {
        await PromotionService.useCoupon({
          bizId: biz.id,
          couponCode: coupon.code,
          customerId: customerId,
        });
      }
    }

    delCache({ model: "order", alias: body.bizId });
  } catch (error) {
    console.log({ error });
    result.status = 500;
    result.message = error.toString();
    result = resolveBackdoor({ bodyParams, data: result });
  }

  return result;
};

export const updateOne = async (bodyParams) => {
  let result = {};
  try {
    const handlerQueryValidator = await queryValidator(bodyParams.query, {
      bizId: { type: String, required: true },
      id: { type: String, required: true },
    });

    const handlerValidator = await bodyValidator(bodyParams.data, {
      bizId: { type: String, required: true },
      ...orderCreateModel,
      updatedBy: {
        id: String,
        name: String,
        email: String,
        picture: String,
      },
    });

    if (!handlerValidator.valid || !handlerQueryValidator.valid) {
      return rejectBackdoor({
        bodyParams,
        status: 422,
        statusText: "BAD_USER_INPUT",
        data: handlerValidator,
        queryData: handlerQueryValidator,
      });
    }

    const { body } = handlerValidator;
    const {
      querymen: { query },
    } = handlerQueryValidator;
    const biz = await Biz.findById_byCache(body.bizId);
    if (!biz) {
      return rejectBackdoor({
        bodyParams,
        message: "Không tìm thấy Biz!",
        status: 403,
        statusText: "BIZ_NOT_FOUND",
      });
    }

    let oldOrder = null;
    const order = await Order.findOne({
      bizId: biz.id,
      _id: query.id,
    });

    if (!order) {
      return rejectBackdoor({
        bodyParams,
        message: "Đơn hàng không tồn tại",
        status: 404,
        statusText: "ORDER_NOT_FOUND",
      });
    }

    oldOrder = JSON.parse(JSON.stringify(order.view(true)));

    cleanObjectBodymen(body);

    // Check trạng thái đơn hàng
    const statusConfig = ORDER_STATUS_CONFIG[order.status] || {};
    if (!statusConfig.next.includes(body.status)) {
      return rejectBackdoor({
        bodyParams,
        message: `Trạng thái đơn hàng không hợp lệ.`,
        status: 400,
        statusText: "BAD_REQUEST",
      });
    }

    if (!statusConfig.isEdit) {
      const newOrder = await Object.assign(order, {
        status: body.status,
        note: body.note,
        updatedBy: body.updatedBy,
      }).save();

      result.data = newOrder.view(true);
      result = resolveBackdoor({ bodyParams, data: result });

      delCache({ model: "order", alias: body.bizId });
      return result;
    }

    await handleOrderData({ body, biz, oldOrder });

    await Object.assign(order, {
      ...body,
    }).save();

    //Cập nhật lại trạng thái mã khuyến mãi
    await handleCouponChanges({
      oldCoupons: oldOrder?.coupons || [],
      newCoupons: order.coupons || [],
      bizId: biz.id,
      viewer: body.updatedBy,
      customerId: order.customer?.id,
    });

    result.data = order.view(true);
    result = resolveBackdoor({ bodyParams, data: result });

    delCache({ model: "order", alias: body.bizId });
  } catch (error) {
    result.status = 500;
    result.message = error.toString();
    result = resolveBackdoor({ bodyParams, data: result });
  }

  return result;
};
