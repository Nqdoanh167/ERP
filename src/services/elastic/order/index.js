import { elasticDB } from "../index";
export const INDEX_ORDER = "es_order";
import Order from "../../../api/models/order";

/**
 * Khai báo 1 số trường cần thiết
 * 1 số trường mặc định k cần khai báo dạng: object (json array, json object), boolean, number
 */

export const objMappingOrder = {
  id: { type: "keyword" },
  bizId: { type: "keyword" },
  status: { type: "keyword" },
  code: {
    type: "text",
    fields: {
      keyword: { type: "keyword" },
    },
  },
  author: { type: "keyword" },
  updatedBy: {
    type: "object",
    properties: {
      id: { type: "keyword" },
      name: { type: "keyword" },
      email: { type: "keyword" },
      picture: { type: "keyword" },
    },
  },
  customer: {
    type: "object",
    properties: {
      id: { type: "keyword" },
      name: { type: "text", fields: { keyword: { type: "keyword" } } },
      phone: { type: "text", fields: { keyword: { type: "keyword" } } },
      email: { type: "keyword" },
      picture: { type: "keyword" },
      province: { type: "keyword" },
      district: { type: "keyword" },
      ward: { type: "keyword" },
      provinceCode: { type: "keyword" },
      districtCode: { type: "keyword" },
      wardCode: { type: "keyword" },
      street: { type: "keyword" },
      address: { type: "keyword" },
      facebook: {
        type: "object",
        properties: {
          id: { type: "keyword" },
          pageid: { type: "keyword" },
          pagename: { type: "keyword" },
        },
      },
      zalo: {
        type: "object",
        properties: {
          id: { type: "keyword" },
          oaId: { type: "keyword" },
          oaName: { type: "keyword" },
        },
      },
      zaloweb: {
        type: "object",
        properties: {
          id: { type: "keyword" },
          pageid: { type: "keyword" },
        },
      },
    },
  },

  cart: {
    type: "nested",
    properties: {
      id: { type: "keyword" },
      product: { type: "keyword" },
      sku: { type: "keyword" },
      name: { type: "keyword" },
      picture: { type: "keyword" },
      note: { type: "keyword" },
      quantity: { type: "integer" },
      categoryIds: { type: "keyword" },
      priceBranch: {
        type: "object",
        properties: {
          name: { type: "keyword" },
          price: { type: "double" },
          branchId: { type: "keyword" },
        },
      },
      toppings: {
        type: "object",
        properties: {
          id: { type: "keyword" },
          choice: { type: "keyword" },
          name: { type: "keyword" },
          answers: { type: "keyword" },
          answerNames: { type: "keyword" },
          values: {
            type: "object",
            properties: {
              id: { type: "keyword" },
              name: { type: "keyword" },
              originalPrice: { type: "double" },
              discount: { type: "integer" },
              price: { type: "double" },
              isDefault: { type: "boolean" },
              priceBranch: {
                type: "object",
                properties: {
                  name: { type: "keyword" },
                  price: { type: "double" },
                  branchId: { type: "keyword" },
                },
              },
            },
          },
          couponId: { type: "keyword" },
          couponName: { type: "keyword" },
        },
      },
      isGift: { type: "boolean" },
      originalPrice: { type: "double" },
      price: { type: "double" },
      realPrice: { type: "double" },
      amountDiscount: { type: "keyword" },
      amountDiscountNumber: { type: "integer" },
      amountDiscountType: { type: "keyword" },
      amount: { type: "keyword" },
    },
  },

  branch: {
    type: "object",
    properties: {
      id: { type: "keyword" },
      name: { type: "keyword" },
    },
  },

  shipment: {
    type: "object",
    properties: {
      id: { type: "keyword" },
      name: { type: "keyword" },
      address: { type: "keyword" },
      phone: { type: "keyword" },
      note: { type: "keyword" },
      receiver: {
        type: "object",
        properties: {
          name: { type: "keyword" },
          phone: { type: "keyword" },
          province: { type: "keyword" },
          district: { type: "keyword" },
          ward: { type: "keyword" },
          provinceCode: { type: "keyword" },
          districtCode: { type: "keyword" },
          wardCode: { type: "keyword" },
          street: { type: "keyword" },
          address: { type: "keyword" },
        },
      },
    },
  },

  isPaid: { type: "boolean" },

  coupons: {
    type: "nested",
    properties: {
      id: { type: "keyword" },
      allowedCustomerId: { type: "keyword" },
      expiredAt: { type: "date" },
      campaignId: { type: "keyword" },
      promotionId: { type: "keyword" },
      code: { type: "keyword" },
      promotionType: { type: "keyword" },
      promotionName: { type: "keyword" },
      promotionSetting: {
        type: "object",
        properties: {
          discount: { type: "double" },
          percent: { type: "integer" },
          maxPrice: { type: "double" },
          giveProducts: { type: "keyword" },
          giveToppings: { type: "keyword" },
        },
      },
      totalDiscount: { type: "double" },
      note: { type: "keyword" },
    },
  },
  orderType: { type: "keyword" },
  cartTotalAmount: { type: "double" },
  deliveryFee: { type: "double" },
  surcharge: { type: "double" },
  totalAmount: { type: "double" },
  amountCoupon: { type: "double" },
  amountDiscount: { type: "double" },
  totalDiscount: { type: "double" },
  note: { type: "keyword" },
  createdAt: { type: "date" },
  updatedAt: { type: "date" },
};

const objSetting = {
  analysis: {
    normalizer: {
      lowercase_normalizer: {
        type: "custom",
        filter: ["lowercase", "asciifolding"],
      },
    },
    analyzer: {
      vi_analyzer: {
        tokenizer: "standard",
        filter: ["lowercase", "asciifolding"],
      },
    },
  },
};

export const mappingSchemaOrder = async (elasticDB) => {
  try {
    if (!elasticDB) return;

    const hasIndex = await elasticDB.indices.exists({ index: INDEX_ORDER });
    if (hasIndex) {
      await elasticDB.indices.close({ index: INDEX_ORDER });

      await elasticDB.indices.putSettings({
        index: INDEX_ORDER,
        body: objSetting,
      });

      await elasticDB.indices.open({ index: INDEX_ORDER });

      const updateIndex = await elasticDB.indices.putMapping({
        index: INDEX_ORDER,
        body: {
          properties: objMappingOrder,
        },
      });
      console.log("updateIndex", INDEX_ORDER, updateIndex);
    } else {
      const createIndex = await elasticDB.indices.create({
        index: INDEX_ORDER,
        body: {
          mappings: {
            properties: objMappingOrder,
          },
          settings: objSetting,
        },
      });
      console.log("createIndex", INDEX_ORDER, createIndex);
    }
  } catch (error) {
    console.log("Mapping schema order error", error);
  }
};

function formatDocument(item) {
  item = item.toObject();
  item.id = String(item._id);
  item.cart = item.cart?.map((item) => ({
    id: String(item.id || item._id),
    product: item.product,
    sku: item.sku,
    name: item.name,
    picture: item.picture,
    note: item.note,
    quantity: item.quantity,
    categoryIds: item.categoryIds,
    priceBranch: item.priceBranch,
    toppings: item.toppings,
    isGift: item.isGift || false,
    originalPrice: item.originalPrice || 0,
    price: item.price || 0,
    realPrice: item.realPrice || 0,
    amountDiscount: item.amountDiscount || 0,
    amountDiscountNumber: item.amountDiscountNumber || 0,
    amountDiscountType: item.amountDiscountType || "absolute",
    amount: item.amount || 0,
  }));
  item.coupons = item.coupons?.map((item) => ({
    id: String(item.id || item._id),
    allowedCustomerId: item.allowedCustomerId,
    expiredAt: item.expiredAt,
    campaignId: item.campaignId,
    promotionId: item.promotionId,
    code: item.code,
    promotionType: item.promotionType,
    promotionName: item.promotionName,
    promotionSetting: item.promotionSetting,
    totalDiscount: item.totalDiscount || 0,
    note: item.note,
  }));

  delete item.__v;
  delete item._id;
  return item;
}

export const syncOrderToElastic = async (order) => {
  try {
    if (order) {
      const body = formatDocument(order);
      const result = await elasticDB.index({
        index: INDEX_ORDER,
        id: String(order.id),
        body,
      });
      console.log("Sync order to elastic result", result);
    }
  } catch (error) {
    console.log(
      "Sync order to elastic error",
      JSON.stringify(error?.meta?.body, null, 2)
    );
  }
};

export const delOrderToElastic = async (orderId) => {
  try {
    if (orderId) {
      await elasticDB.delete({
        index: INDEX_ORDER,
        id: String(orderId),
      });
    }
  } catch (error) {
    console.log("Del order to elastic error", error);
  }
};

export const syncMultiOrderToElastic = async ({ orders, ids }) => {
  try {
    if (!orders?.length & ids?.length) {
      orders = await Order.find({ _id: { $in: ids } }).limit(ids.length);
    }
    let concurrency = 50;
    while (orders.length) {
      let newBody = [];
      let listOrder = orders.splice(0, concurrency);
      try {
        for (let order of listOrder) {
          order = formatDocument(order);
          newBody.push({
            index: { _index: INDEX_ORDER, _id: String(order.id) },
          });
          newBody.push(order);
        }

        await elasticDB.bulk({
          index: INDEX_ORDER,
          body: newBody,
        });
      } catch (error) {
        console.log("error", error);
      }
    }
  } catch (error) {
    console.log("error elasticSyncMultiOrder", error.toString());
  }
};
