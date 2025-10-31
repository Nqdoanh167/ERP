export const ORDER_TYPE = {
  DELIVERY: "delivery",
  DINE_IN: "dine-in",
  TAKE_AWAY: "take-away",
};

export const ORDER_STATUS = {
  NEW: "new",
  PENDING: "pending",
  SHIPPING: "shipping",
  COMPLETED: "completed",
  TRASH: "trash",
  CANCELLED: "cancelled",
};

export const ORDER_STATUS_CONFIG = {
  [ORDER_STATUS.NEW]: {
    next: [
      ORDER_STATUS.NEW,
      ORDER_STATUS.PENDING,
      ORDER_STATUS.SHIPPING,
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.TRASH,
      ORDER_STATUS.CANCELLED,
    ],
    isEdit: true,
  },
  [ORDER_STATUS.PENDING]: {
    next: [
      ORDER_STATUS.PENDING,
      ORDER_STATUS.SHIPPING,
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.TRASH,
      ORDER_STATUS.CANCELLED,
    ],
    isEdit: true,
  },
  [ORDER_STATUS.SHIPPING]: {
    next: [
      ORDER_STATUS.SHIPPING,
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.TRASH,
      ORDER_STATUS.CANCELLED,
    ],
    isEdit: false,
  },
  [ORDER_STATUS.COMPLETED]: {
    next: [ORDER_STATUS.COMPLETED],
    isEdit: false,
  },
  [ORDER_STATUS.TRASH]: {
    next: [ORDER_STATUS.TRASH],
    isEdit: false,
  },
  [ORDER_STATUS.CANCELLED]: {
    next: [ORDER_STATUS.CANCELLED],
    isEdit: false,
  },
};

export const PROMOTION_TYPE = {
  TOPPING_BONUS: "topping_bonus",
  PRODUCT_BONUS: "product_bonus",
  BUY_X_BONUS_Y: "buy_X_bonus_Y",
  UP_SIZE: "up_size",
  PERCENT_OFF_COUPON: "percent_off_coupon",
  DISCOUNT_VOUCHER: "discount_voucher",
};
