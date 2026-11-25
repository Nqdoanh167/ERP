import mongoose, { Schema } from "mongoose";

/**
 * Chương trình flash-sale: bán `quantity` suất của 1 món trong khung [startAt, endAt].
 * Tồn kho thật nằm trong Redis (xem services/redis/flash-sale-scripts.js), Mongo chỉ lưu cấu hình.
 */
const flashSaleSchema = new Schema(
  {
    bizId: { type: String, required: true, index: true },
    name: String,
    item: {
      product: String,
      sku: String,
      name: String,
      picture: String,
      originalPrice: { type: Number, default: 0, min: 0 },
      price: { type: Number, default: 0, min: 0 }, // Giá flash-sale
    },
    quantity: { type: Number, required: true, min: 1 }, // Tổng số suất
    limitPerUser: { type: Number, default: 1, min: 1 }, // Tối đa / SĐT
    holdMinutes: { type: Number, default: 10, min: 1 }, // Giữ suất chờ thanh toán
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
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

flashSaleSchema.methods = {
  view(full) {
    const view = {
      id: this.id,
      bizId: this.bizId,
      name: this.name,
      item: this.item,
      quantity: this.quantity,
      limitPerUser: this.limitPerUser,
      holdMinutes: this.holdMinutes,
      startAt: this.startAt,
      endAt: this.endAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };

    return full ? { ...view } : view;
  },
};

const model = mongoose.model("FlashSale", flashSaleSchema);

export const schema = model.schema;

export const flashSaleCreateModel = {
  name: String,
  item: model.schema.tree.item,
  quantity: { type: Number, required: true, min: 1 },
  limitPerUser: { type: Number, default: 1, min: 1 },
  holdMinutes: { type: Number, default: 10, min: 1 },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
};

export default model;
