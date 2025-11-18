import { removeServiceCache, setServiceCache } from "../../../services/cache";
import { notFound, response } from "../../../services/response";
import { retry } from "../../../utils/common";
import {
  buildOrderEsQuery,
  handleCouponChanges,
  handleOrderData,
} from "./helper";
import { ORDER_STATUS, ORDER_STATUS_CONFIG } from "./constants";
import Order from "../../models/order";
import { NotFoundError } from "../../../services/response/errors";
import PromotionService from "../../../services/axios/promotion";
import {
  delOrderToElastic,
  INDEX_ORDER,
  syncOrderToElastic,
} from "../../../services/elastic/order";
import { elasticDB } from "../../../services/elastic";

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

          const newOrder = await Order.create({
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

          // Sync to elastic
          await syncOrderToElastic(newOrder);

          return newOrder;
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

      // Cập nhật đơn hàng
      const updatedOrder = await Object.assign(order, {
        ...body,
        updatedBy: {
          id: viewer.id,
          name: viewer.name,
          email: viewer.email,
          picture: viewer.picture,
        },
      }).save();

      // Sync to elastic
      await syncOrderToElastic(updatedOrder);

      return resolve(updatedOrder);
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

  try {
    if (elasticDB) {
      const esQuery = buildOrderEsQuery(biz.id, req.query);
      console.log(JSON.stringify(esQuery, null, 2));

      if (esQuery) {
        const bodySearch = {
          query: esQuery,
          from: cursor.skip ?? 0,
          size: cursor.limit ?? 20,
          track_total_hits: true,
        };

        const sort = [];
        if (req.query.q) {
          sort.push({ _score: { order: "desc" } });
        }
        if (cursor.sort && Object.keys(cursor.sort).length > 0) {
          Object.entries(cursor.sort).forEach(([field, order]) => {
            if (field !== "score") {
              sort.push({
                [field]: {
                  order: order === 1 || order === "asc" ? "asc" : "desc",
                },
              });
            }
          });
        }
        if (sort.length > 0) {
          bodySearch.sort = sort;
        }

        const esResult = await elasticDB.search({
          index: INDEX_ORDER,
          body: bodySearch,
        });
        const total = esResult?.hits?.total?.value ?? 0;

        if (total === 0) {
          const data = { data: [], total: 0 };
          response(res, data);
          setServiceCache({ req, model: "order", data });
          return;
        }

        const orderIds = esResult.hits.hits.map((hit) => hit._id);
        const orders = await Order.find({ _id: { $in: orderIds } });
        const data = {
          total,
          data: orders.map((order) => order.view()),
        };

        response(res, data);
        setServiceCache({ req, model: "order", data });
        return;
      }
    }
  } catch (error) {
    console.error("Elasticsearch error, fallback to MongoDB:", error.message);
  }

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
    .then(async (order) => {
      if (!order) {
        throw new NotFoundError("Đơn hàng không tồn tại");
      }
      // Delete from elastic
      await delOrderToElastic(order.id);

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

      const updatedOrder = await Object.assign(order, {
        status: body.status,
        updatedBy: {
          id: viewer.id,
          name: viewer.name,
          email: viewer.email,
          picture: viewer.picture,
        },
      }).save();

      // Sync to elastic
      await syncOrderToElastic(updatedOrder);

      return resolve(updatedOrder);
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

/* 
  Thống kê đơn hàng cho từng status
 */
export const getCountStatus = async (req, res, next) => {
  const {
    biz,
    querymen: { query },
  } = req;

  new Promise(async (resolve, reject) => {
    try {
      query.bizId = biz.id;
      if (req.query.q) {
        query.$text = { $search: req.query.q };
        delete query.keywords;
      }
      const statuses = Object.values(ORDER_STATUS);

      const summary = await Order.aggregate([
        { $match: query },
        {
          $facet: {
            byStatus: [
              {
                $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                  amount: { $sum: "$totalAmount" },
                },
              },
            ],
            total: [
              {
                $count: "count",
              },
            ],
            amount: [
              {
                $group: {
                  _id: null,
                  totalAmount: { $sum: "$totalAmount" },
                },
              },
            ],
          },
        },
      ]);

      console.log(JSON.stringify(summary, null, 2));

      const byStatus = summary[0]?.byStatus || [];
      const total = summary[0]?.total[0]?.count || 0;
      const amount = summary[0]?.amount[0]?.totalAmount || 0;

      return resolve([
        ...statuses.map((status) => {
          const statusData = byStatus.find((s) => s._id === status);
          return {
            status,
            count: statusData ? statusData.count : 0,
            amount: statusData ? statusData.amount : 0,
          };
        }),
        {
          status: "all",
          count: total,
          amount,
        },
      ]);
    } catch (error) {
      return reject(
        new Error(JSON.stringify({ status: 500, message: error.toString() }))
      );
    }
  })
    .then((data) => ({ data }))
    .then((data) => response(res, data))
    .catch(next);
};
