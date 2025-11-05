import { removeServiceCache, setServiceCache } from "../../../services/cache";
import { notFound, response } from "../../../services/response";
import { retry } from "../../../utils/common";
import { handleCouponChanges, handleOrderData } from "./helper";
import { ORDER_STATUS, ORDER_STATUS_CONFIG } from "./constants";
import Order from "../../models/order";
import { NotFoundError } from "../../../services/response/errors";
import PromotionService from "../../../services/axios/promotion";

export const create = async (req, res, next) => {
  const {
    biz,
    viewer,
    bodymen: { body },
  } = req;

  new Promise(async (resolve, reject) => {
    try {
      await handleOrderData({ body, biz });

      return resolve(
        await retry(async () => {
          // Tạo code
          const lastOrder = await Order.findOne({ bizId: biz.id }).sort({
            nid: -1,
          });

          const nid = (lastOrder?.nid || 0) + 1;
          const code = "DH" + nid.toString().padStart(5, "0");
          const uniqueCode = `${biz.id}_${code}`;

          return await Order.create({
            ...body,
            nid,
            code,
            uniqueCode,
            bizId: biz.id,
            author: viewer.id,
            updatedBy: {
              id: viewer.id,
              name: viewer.name,
              email: viewer.email,
              picture: viewer.picture,
            },
          });
        })
      );
    } catch (error) {
      return reject(
        new Error(JSON.stringify({ status: 500, message: error.toString() }))
      );
    }
  })
    .then((order) => ({ data: order.view(true) }))
    .then((data) => response(res, data))
    .then(async (data) => {
      //Cập nhật lại trạng thái mã khuyến mãi
      const coupons = data.data.coupons || [];
      const customerId = data.data.customer?.id;
      for (const coupon of coupons) {
        if (coupon.code) {
          await PromotionService.useCoupon({
            bizId: biz.id,
            couponCode: coupon.code,
            customerId: customerId,
          });
        }
      }
    })
    .then(() => removeServiceCache({ req, model: "order" }))
    .catch(next);
};

export const update = async (req, res, next) => {
  const {
    biz,
    viewer,
    bodymen: { body },
    params,
  } = req;

  let oldOrder = null;
  new Promise(async (resolve, reject) => {
    try {
      const order = await Order.findOne({
        bizId: biz.id,
        _id: params.id,
      });

      if (!order) {
        return reject(
          new Error(
            JSON.stringify({
              status: 404,
              message: "Đơn hàng không tồn tại",
            })
          )
        );
      }

      oldOrder = JSON.parse(JSON.stringify(order.view(true)));

      // Check trạng thái đơn hàng
      const statusConfig = ORDER_STATUS_CONFIG[order.status] || {};
      if (!statusConfig.next.includes(body.status)) {
        return reject(
          new Error(
            JSON.stringify({
              status: 400,
              message: `Trạng thái đơn hàng không hợp lệ.`,
            })
          )
        );
      }

      if (!statusConfig.isEdit) {
        return resolve(
          await Object.assign(order, {
            status: body.status,
            note: body.note,
            updatedBy: {
              id: viewer.id,
              name: viewer.name,
              email: viewer.email,
              picture: viewer.picture,
            },
          }).save()
        );
      }

      await handleOrderData({ body, biz, oldOrder });

      // Tạo đơn hàng
      return resolve(
        await Object.assign(order, {
          ...body,
          updatedBy: {
            id: viewer.id,
            name: viewer.name,
            email: viewer.email,
            picture: viewer.picture,
          },
        }).save()
      );
    } catch (error) {
      return reject(
        new Error(JSON.stringify({ status: 500, message: error.toString() }))
      );
    }
  })
    .then((order) => ({ data: order.view(true) }))
    .then((data) => response(res, data))
    .then(async (data) => {
      //Cập nhật lại trạng thái mã khuyến mãi
      await handleCouponChanges({
        oldCoupons: oldOrder?.coupons || [],
        newCoupons: data.data.coupons || [],
        bizId: biz.id,
        viewer: {
          id: viewer.id,
          name: viewer.name,
          email: viewer.email,
          picture: viewer.picture,
        },
        customerId: data.data.customer?.id,
      });
    })
    .then(() => removeServiceCache({ req, model: "order" }))
    .catch(next);
};

export const index = async (req, res, next) => {
  const {
    biz,
    querymen: { query, select, cursor },
  } = req;

  query.bizId = biz.id;
  if (req.query.q) {
    query.$text = { $search: req.query.q };
    delete query.keywords;
    select.score = { $meta: "textScore" };
    cursor.sort = { score: { $meta: "textScore" } };
  }

  if (query.status === "all") {
    delete query.status;
    query.status = {
      $in: Object.values(ORDER_STATUS),
    };
  }
  Order.countDocuments(query)
    .then((total) => {
      if (total === 0) {
        return { data: [], total };
      }
      return Order.find(query, select, cursor).then((orders) => ({
        total,
        data: orders.map((order) => order.view()),
      }));
    })
    .then((data) => response(res, data))
    .then((data) => setServiceCache({ req, model: "order", data }))
    .catch(next);
};

export const show = async (req, res, next) => {
  const { biz, params } = req;
  Order.findOne({ _id: params.id, bizId: biz.id })
    .then(notFound(res))
    .then((order) => ({ data: order ? order.view() : null }))
    .then((data) => response(res, data))
    .then((data) => setServiceCache({ req, model: "order", data }))
    .catch(next);
};

export const destroy = async (req, res, next) => {
  const { biz, params } = req;
  Order.findOne({ _id: params.id, bizId: biz.id })
    .then((order) => {
      if (!order) {
        throw new NotFoundError("Đơn hàng không tồn tại");
      }
      return order.remove();
    })
    .then((order) => ({ data: order.view(true) }))
    .then((data) => response(res, data))
    .then(() => removeServiceCache({ req, model: "order" }))
    .catch(next);
};

export const updateStatus = async (req, res, next) => {
  const {
    biz,
    viewer,
    bodymen: { body },
  } = req;

  new Promise(async (resolve, reject) => {
    try {
      const order = await Order.findOne({
        bizId: biz.id,
        _id: body.orderId,
      });

      if (!order) {
        return reject(
          new Error(
            JSON.stringify({
              status: 404,
              message: "Đơn hàng không tồn tại",
            })
          )
        );
      }

      // Check trạng thái đơn hàng
      const statusConfig = ORDER_STATUS_CONFIG[order.status] || {};
      if (!statusConfig.next.includes(body.status)) {
        return reject(
          new Error(
            JSON.stringify({
              status: 400,
              message: `Trạng thái đơn hàng không hợp lệ.`,
            })
          )
        );
      }

      return resolve(
        await Object.assign(order, {
          status: body.status,
          updatedBy: {
            id: viewer.id,
            name: viewer.name,
            email: viewer.email,
            picture: viewer.picture,
          },
        }).save()
      );
    } catch (error) {
      return reject(
        new Error(JSON.stringify({ status: 500, message: error.toString() }))
      );
    }
  })
    .then((order) => ({ data: order.view(true) }))
    .then((data) => response(res, data))
    .then(() => removeServiceCache({ req, model: "order" }))
    .catch(next);
};
