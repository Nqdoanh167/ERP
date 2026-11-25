# Phase 03 — Biz API mua + xem trạng thái

> **Cập nhật 2026-11-25:** bỏ partner/public API. `buy` + `reservationStatus` nằm ở `src/api/biz/flash-sale/reservation-controller.js`, route `/bizs/:bizAlias/{service}/flash-sales` (`token`).

**Priority:** cao | **Status:** done | **Depends:** 01, 02

## Files
- Tạo: `src/api/partner/flash-sale/index.js`, `src/api/partner/flash-sale/controller.js`
- Sửa: `src/api/partner/index.js` — mount `/flash-sales` **trước** `router.use("/", order)` (nếu không `GET /:id` của order nuốt route)

## Endpoints (`/public/bizs/:bizAlias/{service}/flash-sales`, `bizToken`)
| Method | Path | Body / Kết quả |
|---|---|---|
| POST | `/:id/buy` | `{ qty, customer (phone bắt buộc), shipment, branch, orderType, note }` → `202 { reservationId }` |
| GET | `/:id/reservations/:reservationId` | `PROCESSING` \| `CREATED` (+order) \| `EXPIRED` |

## buy
```js
export const buy = async (req, res, next) => {
  const { biz, params: { id: saleId }, bodymen: { body } } = req;
  const { qty, ...orderInfo } = body;
  const buyer = normalizePhone(orderInfo.customer?.phone);
  if (!buyer) return response(res, { status: 400, message: "Thiếu số điện thoại" });

  const reservationId = new mongoose.Types.ObjectId().toString();
  try {
    const result = await reserveSlot({ saleId, buyer, qty, reservationId });
    if (result < 0) return response(res, { status: 409, message: RESERVE_MESSAGE[result] });

    const sale = await FlashSale.findOne({ _id: saleId, bizId: biz.id });
    try {
      await ManageQueue.create([
        {
          name: "FLASH_SALE_CREATE_ORDER",
          worker: "FLASH_SALE_CREATE_ORDER",
          uniqueCode: `FS_ORDER_${reservationId}`,
          schedule: new Date(),
          priority: 1,
          data: { saleId, reservationId, qty, orderInfo, bizId: biz.id },
        },
        {
          name: "FLASH_SALE_EXPIRE",
          worker: "FLASH_SALE_EXPIRE",
          uniqueCode: `FS_EXPIRE_${reservationId}`,
          schedule: new Date(Date.now() + sale.holdMinutes * 60000),
          data: { saleId, reservationId },
        },
      ]);
    } catch (err) {
      // Suất đã trừ trong Redis, không hoàn thì bị kẹt
      await releaseSlot({ saleId, reservationId }).catch(() => {});
      throw err;
    }
    return response(res, { status: 202, data: { reservationId } });
  } catch (error) {
    return next(error);
  }
};
```
- `RESERVE_MESSAGE`: -1 "Đã hết suất", -2 "Bạn đã đạt giới hạn mua", -3 "Chương trình chưa mở hoặc đã kết thúc", -4 "Chương trình không tồn tại".
- Chỉ ~N request thắng Lua mới chạm Mongo (`findOne` + `create`). 9.900 request còn lại chỉ tốn 1 lần eval Redis.
- `bodymen`: `qty: { type: Number, min: 1, max: 10, default: 1 }`, các field còn lại lấy từ `orderCreateModel`.

## reservationStatus
```js
const order = await Order.findOne({ bizId: biz.id, "flashSale.reservationId": reservationId });
if (order) return response(res, { data: { status: "CREATED", order: order.view(true) } });
const holding = await isReservationHolding({ saleId, reservationId });
return response(res, { data: { status: holding ? "PROCESSING" : "EXPIRED" } });
```

## Todo
- [x] `normalizePhone` trong `src/utils/common.js` (nếu chưa có)
- [x] Router + controller
- [x] Mount trước order router

## Success
- Hết suất → 409, không tạo ManageQueue doc nào.
- Cùng SĐT mua lần 2 (limit 1) → 409.
