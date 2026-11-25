import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema(
  {
    bizId: { type: String, required: true },
    author: String,
    updatedBy: {
      id: String,
      name: String,
      email: String,
      picture: String,
    },
    status: {
      type: String,
      enum: ["new", "pending", "shipping", "completed", "trash", "cancelled"],
      default: "new",
    },
    uniqueCode: { type: String, unique: true }, // bizId_XXXXXX
    nid: Number,
    code: String,
    customer: {
      id: String,
      name: String,
      phone: String,
      email: String,
      picture: String,
      province: String,
      district: String,
      ward: String,
      provinceCode: String,
      districtCode: String,
      wardCode: String,
      street: String,
      address: String,
      facebook: {
        id: String,
        pageid: String,
        pagename: String,
      },
      zalo: {
        id: String,
        oaId: String,
        oaName: String,
      },
      zaloweb: {
        id: String,
        pageid: String,
      },
    },
    cart: [
      {
        id: String, // cartID
        product: String,
        sku: String,
        name: String,
        picture: String,
        note: String,
        quantity: { type: Number, default: 1 },
        categoryIds: [String],
        priceBranch: {
          name: String,
          price: Number,
          branchId: String,
        },
        toppings: [
          {
            id: String, // ID Nhóm thuộc tính
            choice: {
              type: String,
              enum: ["SINGLE", "MULTIPLE"],
              default: "SINGLE",
            }, // Chọn 1 hoặc nhiều
            name: String, // Tên nhóm thuộc tính
            answers: [String], // List ID Value
            answerNames: [String], // List Name value
            values: [
              {
                id: { type: String }, // ID Value
                name: String, // Tên thuộc tính
                originalPrice: Number, // Giá gốc
                discount: Number, // Giảm giá
                price: Number, // Giá bán thực tế
                isDefault: { type: Boolean, default: false }, // Mặc định chọn
                priceBranch: {
                  name: String,
                  price: Number,
                  branchId: String,
                },
              },
            ],
            couponId: String, // ID voucher nếu có
            couponName: String, // Tên voucher nếu có
          },
        ],
        isGift: { type: Boolean, default: false },
        originalPrice: { type: Number, default: 0 }, // Giá gốc
        price: { type: Number, default: 0 }, // Giá bán hiển thị (cả topping)
        realPrice: { type: Number, default: 0 }, // Giá bán thực tế (đã trừ giảm giá)
        amountDiscount: Number, // Tổng tiền giảm giá cho món này
        amountDiscountNumber: Number, // Số tiền giảm giá cho món này
        amountDiscountType: {
          // Loại giảm giá cho món này
          type: String,
          enum: ["absolute", "percent"],
          default: "absolute",
        },
        amount: Number, // Thành tiền = realPrice * quantity
      },
    ],
    branch: {
      id: String,
      name: String,
    },
    shipment: {
      id: String,
      name: String,
      address: String,
      phone: String,
      note: String,
      receiver: {
        name: String,
        phone: String,
        province: String,
        district: String,
        ward: String,
        provinceCode: String,
        districtCode: String,
        wardCode: String,
        street: String,
        address: String,
      },
    },
    isPaid: { type: Boolean, default: false },
    coupons: [
      {
        id: { type: String, required: true },
        allowedCustomerId: String,
        expiredAt: Date,
        campaignId: String,
        promotionId: String,
        code: String,
        promotionType: String,
        promotionName: String,
        promotionSetting: {
          discount: Number,
          percent: Number,
          maxPrice: Number,
          giveProducts: [String],
          giveToppings: [String],
        },
        totalDiscount: { type: Number, default: 0, min: 0 }, // Số tiền giảm giá cho đơn hàng của voucher này tính từ promotionType + promotionSetting
        note: String,
      },
    ],
    orderType: {
      type: String,
      enum: ["delivery", "dine-in", "take-away"], // Giao hàng, tại chỗ, mang đi
      default: "delivery",
    },
    cartTotalAmount: { type: Number, default: 0, min: 0 }, // Tổng tiền món
    deliveryFee: { type: Number, default: 0, min: 0 }, // Phí vận chuyển
    surcharge: { type: Number, default: 0, min: 0 }, // Phụ thu
    totalAmount: { type: Number, default: 0, min: 0 }, // Thành tiền
    amountCoupon: { type: Number, default: 0, min: 0 }, // Tổng tiền giảm từ coupon
    amountDiscount: { type: Number, default: 0, min: 0 }, // Tổng tiền giảm tự nhập
    totalDiscount: { type: Number, default: 0, min: 0 }, // Tổng tiền giảm giá
    note: String,
    flashSale: {
      id: String, // FlashSale id
      reservationId: String, // Mỗi suất giữ chỉ sinh tối đa 1 đơn
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (obj, ret) => {
        delete ret._id;
      },
    },
  }
);
// Indexes
orderSchema.index({ bizId: 1, status: 1, createdAt: -1 });
orderSchema.index({ bizId: 1, nid: -1 }); // createOrderWithCode lấy nid lớn nhất
orderSchema.index({
  bizId: 1,
  code: "text",
  "customer.name": "text",
  "customer.phone": "text",
});
orderSchema.index(
  { "flashSale.reservationId": 1 },
  {
    unique: true,
    partialFilterExpression: { "flashSale.reservationId": { $exists: true } },
  }
);

orderSchema.methods = {
  view(full) {
    let view = {
      // simple view
      id: this.id,
      bizId: this.bizId,
      status: this.status,
      code: this.code,
      customer: this.customer,
      cart: (this.cart || []).map((item) => ({
        id: item.id || item._id,
        product: item.product,
        sku: item.sku,
        name: item.name,
        picture: item.picture,
        note: item.note,
        quantity: item.quantity,
        categoryIds: item.categoryIds,
        priceBranch: item.priceBranch,
        toppings: item.toppings,
        isGift: item.isGift,
        originalPrice: item.originalPrice,
        price: item.price,
        realPrice: item.realPrice,
        amountDiscount: item.amountDiscount,
        amountDiscountNumber: item.amountDiscountNumber,
        amountDiscountType: item.amountDiscountType,
        amount: item.amount,
      })),
      branch: this.branch,
      shipment: this.shipment,
      isPaid: this.isPaid,
      coupons: (this.coupons || []).map((coupon) => ({
        id: coupon.id || coupon._id,
        allowedCustomerId: coupon.allowedCustomerId,
        expiredAt: coupon.expiredAt,
        campaignId: coupon.campaignId,
        promotionId: coupon.promotionId,
        code: coupon.code,
        promotionType: coupon.promotionType,
        promotionName: coupon.promotionName,
        promotionSetting: coupon.promotionSetting,
        totalDiscount: coupon.totalDiscount,
        note: coupon.note,
      })),
      orderType: this.orderType,
      cartTotalAmount: this.cartTotalAmount,
      deliveryFee: this.deliveryFee,
      surcharge: this.surcharge,
      totalAmount: this.totalAmount,
      amountCoupon: this.amountCoupon,
      amountDiscount: this.amountDiscount,
      totalDiscount: this.totalDiscount,
      note: this.note,
      flashSale: this.flashSale,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy,
    };

    return full
      ? {
          ...view,
        }
      : view;
  },
};

const model = mongoose.model("Order", orderSchema);

export const schema = model.schema;

export const orderCreateModel = {
  status: String,
  customer: model.schema.tree.customer,
  cart: model.schema.tree.cart,
  branch: model.schema.tree.branch,
  shipment: model.schema.tree.shipment,
  isPaid: Boolean,
  coupons: model.schema.tree.coupons,
  orderType: String,
  cartTotalAmount: Number,
  deliveryFee: Number,
  surcharge: Number,
  totalAmount: Number,
  amountCoupon: Number,
  amountDiscount: Number,
  totalDiscount: Number,
  note: model.schema.tree.note,
};

export const orderUpdateModel = {
  status: String,
  code: model.schema.tree.code,
  customer: model.schema.tree.customer,
  cart: model.schema.tree.cart,
  branch: model.schema.tree.branch,
  shipment: model.schema.tree.shipment,
  isPaid: Boolean,
  coupons: model.schema.tree.coupons,
  orderType: String,
  cartTotalAmount: Number,
  deliveryFee: Number,
  surcharge: Number,
  totalAmount: Number,
  amountCoupon: Number,
  amountDiscount: Number,
  totalDiscount: Number,
  note: model.schema.tree.note,
};

export default model;
