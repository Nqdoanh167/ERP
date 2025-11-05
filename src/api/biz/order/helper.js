import Customer from "../../../services/axios/customer";
import Location from "../../../services/axios/location";
import Product from "../../../services/axios/product";
import { isEmptyArray } from "../../../utils/type-check";
import { ORDER_TYPE, PROMOTION_TYPE } from "./constants";
import PromotionService from "../../../services/axios/promotion";
import { cleanObjectBodymen } from "../../../utils/common";

export const getCustomer = async ({ body = {}, bizId }) => {
  let customer = null;
  try {
    if (body.id) {
      customer = await Customer.findOne({ bizId, id: body.id });
    }

    if (!customer && (body.phone || body.name || body.email)) {
      if (!body.name) body.name = body.phone;

      const queryCustomer = { bizId };
      const bodyCustomer = { ...body };

      if (body.phone) queryCustomer.phone = body.phone;
      // email k đúng => bỏ
      if (body.email) {
        if (!String(body.email).match(/^\S+@\S+\.\S+$/)) delete body.email;

        if (body.email) queryCustomer.email = body.email;
      }

      // Xóa các dữ liệu có giá trị null để tránh bị update vào customer;
      Object.keys(bodyCustomer).forEach((f) => {
        if (bodyCustomer[f] === null) delete bodyCustomer[f];
      });

      customer = await Customer.findOne_addOne(queryCustomer, {
        ...bodyCustomer,
        name: bodyCustomer.name || bodyCustomer.phone,
      });
    }
  } catch (error) {
    console.log("getCustomer", error);
    throw error;
  }
  return customer;
};

export const getInfoLocation = async ({ body = {}, biz }) => {
  // address
  body.address = body.street || "";
  // Check gửi 1 trong 3 ward, district, province. Gửi cái nào thì ghép địa chỉ của trường đó
  let area = null;
  if (body.wardCode) {
    area = await Location.findOneWard({
      wardCode: body.wardCode,
      location: biz.location,
    });
    // console.log('area', area)
    if (area) {
      if (body.address) body.address += ",";
      body.address = `${body.address} ${area.ward}, ${area.district}, ${area.province}`;
      body.provinceCode = area.provinceCode;
      body.districtCode = area.districtCode;
      body.province = area.province;
      body.district = area.district;
      body.ward = area.ward;
    }
  } else if (body.districtCode) {
    area = await Location.findOneDistrict({
      districtCode: body.districtCode,
      location: biz.location,
    });
    if (area) {
      if (body.address) body.address += ",";
      body.address = `${body.address} ${area.district}, ${area.province}`;
      body.districtCode = area.districtCode;
      body.provinceCode = area.provinceCode;
      body.wardCode = null;
      body.district = area.district;
      body.province = area.province;
      body.ward = null;
    }
  } else if (body.provinceCode) {
    area = await Location.findOneProvince({
      provinceCode: body.provinceCode,
      location: biz.location,
    });
    if (area) {
      if (body.address) body.address += ",";
      body.address = `${body.address} ${area.province}`;
      body.districtCode = null;
      body.wardCode = null;
      body.province = area.province;
      body.district = null;
      body.ward = null;
    }
  }
  if (area?.postcodes?.length && !body.postcode) {
    body.postcode = area?.postcodes[0] || null;
  }
  if (area?.postcodes?.length && body.postcode) {
    if (!area.postcodes.includes(body.postcode)) {
      body.postcode = area?.postcodes[0] || null;
    }
  } else {
    delete body.postcode;
  }
  return body;
};
/* 
 Cập nhật cart
 Cập nhật cartTotalAmount
*/
export async function buildCartItems(body, biz) {
  body.cart = Array.isArray(body.cart)
    ? body.cart.filter((i) => !i.isGift)
    : [];

  if (isEmptyArray(body.cart)) return;

  // Gộp các sản phẩm giống nhau trong cart
  const cartMap = new Map();
  body.cart.forEach((item) => {
    if (cartMap.has(item.product)) {
      cartMap.get(item.product).quantity += item.quantity || 1;
    } else {
      cartMap.set(item.product, { ...item, quantity: item.quantity || 1 });
    }
  });
  body.cart = Array.from(cartMap.values());

  // Lấy danh sách productIds duy nhất trong cart
  const productIds = Array.from(
    new Set(
      body.cart.filter((item) => item.product).map((item) => item.product)
    )
  );

  let products = [];
  if (productIds.length > 0) {
    products = await Product.findMany({
      bizId: biz.id,
      ids: productIds,
    });

    if (products.length !== productIds.length) {
      throw new Error(
        JSON.stringify({
          status: 400,
          message: "Sản phẩm không tồn tại",
        })
      );
    }
  }

  // Tạo lại danh sách cartItems với thông tin sản phẩm + toppings
  body.cart = body.cart.map((item) => {
    const product = products.find((p) => p.id === item.product);
    const cartItem = {
      product: item.product,
      note: item.note,
      quantity: item.quantity || 1,
      toppings: Array.isArray(item.toppings) ? item.toppings : [],
      originalPrice: 0,
      price: 0,
      realPrice: 0,
      amountDiscount: 0,
      amountDiscountNumber: item.amountDiscountNumber || 0,
      amountDiscountType: item.amountDiscountType || "absolute",
      amount: 0,
    };

    if (product) {
      cartItem.name = product.name;
      cartItem.sku = item.sku;
      cartItem.picture = product.picture;
      cartItem.categoryIds = product.categoryIds || [];
      cartItem.originalPrice = product.price || 0;

      // Nếu có giá chi nhánh
      const priceBranch = (product.priceBranches || [])?.find(
        (pb) => pb.branchId === body.branch?.id
      );
      if (priceBranch) {
        cartItem.priceBranch = priceBranch;
        cartItem.originalPrice = priceBranch.price || 0;
      }
    }

    // Tính giá toppings
    let priceToppings = 0;
    cartItem.toppings.forEach((group) => {
      group.values.forEach((v) => {
        const toppingValue = {
          id: v.id,
          name: v.name,
          originalPrice: v.price || 0,
          price: v.price || 0,
          discount: 0,
          isDefault: v.isDefault || false,
          priceBranch: null,
        };

        // Nếu có giá chi nhánh
        const priceBranch = (v.priceBranches || [])?.find(
          (pb) => pb.branchId === body.branch?.id
        );

        if (priceBranch) {
          toppingValue.priceBranch = priceBranch;
          toppingValue.originalPrice = priceBranch.price || 0;
          toppingValue.price = priceBranch.price || 0;
        }
      });
      priceToppings += group.values
        .filter((v) => group.answers.includes(v.id))
        .reduce((sum, v) => {
          return sum + (v.price || 0);
        }, 0);

      group.answers = group.values
        .filter((v) => group.answers.includes(v.id))
        .map((v) => v.id);

      group.answerNames = group.values
        .filter((v) => group.answers.includes(v.id))
        .map((v) => v.name);
    });

    cartItem.price = cartItem.originalPrice + priceToppings;

    // Tính tiền sản phẩm
    if (cartItem.amountDiscountType === "absolute") {
      cartItem.amountDiscount = cartItem.amountDiscountNumber;
    } else if (cartItem.amountDiscountType === "percent") {
      cartItem.amountDiscount = Math.floor(
        (cartItem.price * cartItem.amountDiscountNumber) / 100
      );
    }

    cartItem.realPrice = Math.max(cartItem.price - cartItem.amountDiscount, 0);
    cartItem.amount = cartItem.realPrice * cartItem.quantity;
    return cartItem;
  });

  body.cartTotalAmount = body.cart.reduce(
    (sum, item) => sum + (item.amount || 0),
    0
  );

  return body;
}

export async function applyPromotions(body, biz, oldOrder = null) {
  body.coupons = Array.isArray(body.coupons) ? body.coupons : [];
  if (body.coupons.length === 0) return;

  const couponIds = Array.from(
    new Set(body.coupons.map((coupon) => coupon.id))
  );

  let coupons = [];
  if (couponIds.length > 0) {
    coupons = await PromotionService.findManyCoupon(
      {
        bizId: biz.id,
        ids: couponIds,
      },
      {
        withPromotion: true, // populate thông tin promotion
      }
    );

    if (couponIds.length !== coupons.length) {
      throw new Error(
        JSON.stringify({
          status: 404,
          message: "Không tìm thấy mã khuyến mãi!",
        })
      );
    }
  }

  for (const coupon of body.coupons) {
    const couponData = coupons.find((p) => p.id === coupon.id);
    if (!couponData) {
      throw new Error(
        JSON.stringify({
          status: 404,
          message: "Không tìm thấy mã khuyến mãi!",
        })
      );
    }

    const {
      promotionId = {},
      promotionType,
      promotionSetting,
      allowedCustomerId,
      expiredAt,
    } = couponData;

    const existingCoupon = oldOrder?.coupons?.find(
      (oldCoupon) => oldCoupon.code === couponData.code
    );

    if (!existingCoupon) {
      await PromotionService.checkCouponUsage({
        bizId: biz.id,
        customerId: body?.customer?.id,
        code: couponData.code,
      });
    }

    // assign value
    coupon.allowedCustomerId = allowedCustomerId;
    coupon.expiredAt = expiredAt;
    coupon.campaignId = couponData.campaignId;
    coupon.promotionId = promotionId.id;
    coupon.code = couponData.code;
    coupon.promotionType = promotionType;
    coupon.promotionName = promotionId?.name;
    coupon.promotionSetting = {
      discount: 0,
      percent: 0,
      maxPrice: 0,
      giveProducts: [],
      giveToppings: [],
    };
    coupon.totalDiscount = 0;
    coupon.note = "";

    switch (promotionType) {
      case PROMOTION_TYPE.TOPPING_BONUS:
        const toppingIds = Array.from(new Set(promotionSetting || []));
        if (toppingIds.length) {
          const toppings = await Product.findManyTopping({
            bizId: biz.id,
            ids: toppingIds,
          });

          toppings.filter(Boolean).map((topping) => {
            coupon.note += `\nTặng topping: ${topping.name}.`;
            coupon.promotionSetting.giveToppings.push(topping.id);
          });
        }
        break;

      case PROMOTION_TYPE.PRODUCT_BONUS: {
        const { conditionType, items = [] } = promotionSetting || {};
        let itemIds = [];
        if (conditionType === "amount") {
          for (const item of items) {
            if (body.cartTotalAmount >= item?.conditionValue) {
              itemIds.push(item.productId);
            }
          }
        } else if (conditionType === "quantity") {
          const totalQuantity = body.cart.filter((item) => !item.isGift).length;
          for (const item of items) {
            if (totalQuantity >= item?.conditionValue) {
              itemIds.push(item.productId);
            }
          }
        }

        const productIds = Array.from(new Set(itemIds.map((id) => id)));
        if (productIds.length) {
          const products = await Product.findMany({
            bizId: biz.id,
            ids: productIds,
          });

          products.filter(Boolean).map((product) => {
            let priceBranch = null;
            if (body.branch?.id) {
              priceBranch = product.priceBranches?.find(
                (pb) => pb.branchId === body.branch.id
              );
            }

            coupon.note += `\nTặng sản phẩm: ${product.name}.`;
            coupon.promotionSetting.giveProducts.push(product.id);
            body.cart.push({
              product: product.id,
              name: product.name,
              picture: product.picture,
              price: product.price,
              note: `Quà tặng từ chương trình khuyến mãi: ${promotionId?.name}`,
              isGift: true,
              toppings: [],
              categoryIds: product.categoryIds || [],
              sku: product.sku,
              priceBranch,
            });
          });
        }
        break;
      }

      case PROMOTION_TYPE.BUY_X_BONUS_Y: {
        for (const setting of promotionSetting || []) {
          const index = body.cart.findIndex(
            (item) => item.product === setting.productId
          );
          if (index === -1) continue;

          if (setting.type === "bonus_topping") {
            const toppingIds = Array.from(
              new Set(setting.items || [].map((i) => i))
            );
            if (toppingIds.length) {
              const toppings = await Product.findManyTopping({
                bizId: biz.id,
                ids: toppingIds,
              });

              toppings.filter(Boolean).map((topping) => {
                coupon.note += `\nTặng topping: ${topping.name}.`;
                coupon.promotionSetting.giveToppings.push(topping.id);
              });
            }
          } else if (setting.type === "bonus_product") {
            const productIds = Array.from(
              new Set(setting.items || [].map((i) => i))
            );
            if (productIds.length) {
              const products = await Product.findMany({
                bizId: biz.id,
                ids: productIds,
              });

              products.filter(Boolean).map((product) => {
                let priceBranch = null;
                if (body.branch?.id) {
                  priceBranch = product.priceBranches?.find(
                    (pb) => pb.branchId === body.branch.id
                  );
                }

                coupon.note += `\nTặng sản phẩm: ${product.name}.`;
                coupon.promotionSetting.giveProducts.push(product.id);
                body.cart.push({
                  product: product.id,
                  name: product.name,
                  picture: product.picture,
                  price: product.price,
                  note: `Quà tặng từ chương trình khuyến mãi: ${promotionId?.name}`,
                  isGift: true,
                  toppings: [],
                  categoryIds: product.categoryIds || [],
                  sku: product.sku,
                  priceBranch,
                });
              });
            }
          }
        }
        break;
      }

      case PROMOTION_TYPE.PERCENT_OFF_COUPON: {
        const percent = promotionSetting?.percent || 0;
        const maxPrice = promotionSetting?.maxPrice || 0;
        if (percent > 0) {
          coupon.totalDiscount = Math.floor(
            (body.cartTotalAmount * percent) / 100
          );
          if (coupon.totalDiscount > maxPrice) {
            coupon.totalDiscount = maxPrice;
          }
          coupon.promotionSetting.percent = percent;
          coupon.promotionSetting.maxPrice = maxPrice;
        }
        break;
      }

      case PROMOTION_TYPE.DISCOUNT_VOUCHER: {
        coupon.totalDiscount = promotionSetting?.discount || 0;
        coupon.promotionSetting.discount = promotionSetting?.discount || 0;
        break;
      }

      case PROMOTION_TYPE.UP_SIZE:
        // TODO: xử lý up size
        break;

      default:
        break;
    }
  }
}

/**
 * Cập nhật trạng thái coupon khi thay đổi đơn hàng
 * - Nếu oldOrder có mà newOrder không có => revert coupon (chưa sử dụng)
 * - Nếu oldOrder không có mà newOrder có => đánh dấu đã sử dụng
 * - Nếu cả hai cùng có => giữ nguyên
 */
export const handleCouponChanges = async ({
  oldCoupons = [],
  newCoupons = [],
  bizId,
  viewer,
  customerId,
}) => {
  try {
    const oldCodes = new Set(oldCoupons.map((c) => c.code).filter(Boolean));
    const newCodes = new Set(newCoupons.map((c) => c.code).filter(Boolean));

    // Xác định coupon cần revert & coupon cần đánh dấu sử dụng
    const removedCoupons = [...oldCodes].filter((code) => !newCodes.has(code));
    const addedCoupons = [...newCodes].filter((code) => !oldCodes.has(code));

    if (removedCoupons.length === 0 && addedCoupons.length === 0) return;

    const tasks = [
      ...removedCoupons.map((code) =>
        PromotionService.revertCoupon({ bizId, code, viewer })
      ),
      ...addedCoupons.map((code) =>
        PromotionService.useCoupon({ bizId, couponCode: code, customerId })
      ),
    ];

    await Promise.allSettled(tasks);
  } catch (error) {
    console.error("[handleCouponChanges] Unexpected error:", error);
  }
};

/**
 * Xử lý dữ liệu đơn hàng
 */
export const handleOrderData = async ({ body, biz, oldOrder = null }) => {
  cleanObjectBodymen(body);

  // 1️⃣ Xử lý khách hàng
  const customer = await getCustomer({
    body: body.customer || {},
    bizId: biz.id,
  });
  if (customer) {
    body.customer.id = customer?.id;
    await getInfoLocation({ body: body.customer, biz });
  }

  //init value
  body.cartTotalAmount = 0;
  body.totalAmount = 0;
  body.amountCoupon = 0;
  body.totalDiscount = 0;
  body.surcharge = body.surcharge || 0;

  // 2️⃣ Xử lý giỏ hàng
  await buildCartItems(body, biz);

  // 3️⃣ Xử lý mã khuyến mãi
  await applyPromotions(body, biz, oldOrder);
  body.note += (body.coupons || []).map((coupon) => coupon.note).join(", ");

  // Nếu coupon có topping thì check xem cart có chứa topping đó không, nếu có thì => tính lại giá trên từng sản phẩm
  for (const coupon of body.coupons || []) {
    if (
      [PROMOTION_TYPE.TOPPING_BONUS, PROMOTION_TYPE.BUY_X_BONUS_Y].includes(
        coupon.promotionType
      ) &&
      !isEmptyArray(coupon.promotionSetting.giveToppings)
    ) {
      body.cart
        .filter((i) => !i.isGift)
        .forEach((cartItem) => {
          let priceToppings = 0;
          cartItem.toppings.forEach((group) => {
            if (coupon.promotionSetting.giveToppings.includes(group.id)) {
              group.values.forEach((v) => {
                v.price = 0;
              });

              // Gán thông tin coupon
              group.couponId = coupon.id;
              group.couponName = coupon.promotionName;
            }

            priceToppings += group.values
              .filter((v) => group.answers.includes(v.id))
              .reduce((sum, v) => {
                return sum + (v.price || 0);
              }, 0);

            cartItem.price = cartItem.originalPrice + priceToppings;
            if (cartItem.amountDiscountType === "absolute") {
              cartItem.amountDiscount = cartItem.amountDiscountNumber;
            } else if (cartItem.amountDiscountType === "percent") {
              cartItem.amountDiscount = Math.floor(
                (cartItem.price * cartItem.amountDiscountNumber) / 100
              );
            }

            cartItem.realPrice = Math.max(
              cartItem.price - cartItem.amountDiscount,
              0
            );
            cartItem.amount = cartItem.realPrice * cartItem.quantity;
          });
        });

      // console.log("---------------------", JSON.stringify(body.cart, null, 2));

      body.cartTotalAmount = body.cart.reduce(
        (sum, item) => sum + (item.amount || 0),
        0
      );
    }
  }

  // 4️⃣ Tính toán tổng tiền & giảm giá
  body.amountCoupon = (body.coupons || []).reduce(
    (sum, coupon) => sum + (coupon.totalDiscount || 0),
    0
  );
  body.totalDiscount = body.amountCoupon + (body.amountDiscount || 0);
  body.totalAmount = Math.max(
    body.cartTotalAmount - body.totalDiscount + body.surcharge,
    0
  );

  if (body?.orderType === ORDER_TYPE.DELIVERY) {
    body.totalAmount += body.deliveryFee || 0;
  }

  return body;
};
