# Phase 04 — Workers tạo đơn / hết hạn + xác nhận thanh toán

**Priority:** cao | **Status:** pending | **Depends:** 01, 03

## Files
- Tạo: `src/services/queue/process/flash-sale/create-order.js`
- Tạo: `src/services/queue/process/flash-sale/expire-reservation.js`
- Sửa: `src/services/queue/bull.js` — đăng ký 2 queue, đều `concurrency: 1` (chạy trong `app/queue.js` single)
- Sửa: `src/api/biz/order/helper.js` — thêm `createOrderWithCode({ bizId, body, updatedBy })` (gom logic sinh `nid`/`code`/`uniqueCode` + `retry` đang copy ở biz và partner controller)
- Sửa: `src/api/biz/flash-sale/*` — thêm endpoint xác nhận thanh toán

## bull.js
```js
FLASH_SALE_CREATE_ORDER: {
  queue: new Queue("FLASH_SALE_CREATE_ORDER", opts),
  concurrency: 1, // sinh nid hiện tại race khi chạy song song
  worker: process_FLASH_SALE_CREATE_ORDER,
},
FLASH_SALE_EXPIRE: {
  queue: new Queue("FLASH_SALE_EXPIRE", opts),
  concurrency: 1,
  worker: process_FLASH_SALE_EXPIRE,
},
```

## create-order.js
```js
export default function process(worker, concurrency = 1) {
  worker.process(concurrency, async (job, done) => {
    const { data } = job;
    const { saleId, reservationId, qty, orderInfo, bizId } = data;
    try {
      const existed = await Order.exists({ "flashSale.reservationId": reservationId });
      const holding = await isReservationHolding({ saleId, reservationId });

      if (!existed && holding) {
        const sale = await FlashSale.findById(saleId);
        const amount = sale.item.price * qty;
        await createOrderWithCode({
          bizId,
          updatedBy: { id: "system", name: "system" },
          body: {
            ...orderInfo,
            cart: [{ ...sale.item, realPrice: sale.item.price, quantity: qty, amount }],
            cartTotalAmount: amount,
            totalAmount: amount,
            flashSale: { id: saleId, reservationId },
          },
        });
        // + syncOrderToElastic như create thường
      }
      await ManageQueue.updateOne({ _id: data.jobId }, { progress: "SUCCESS" });
      done();
    } catch (error) {
      await retryOrGiveUp({ data, error });
      done();
    }
  });
}

// ManageQueue không tự retry job ERROR → tự đặt lại WAITING, hết lượt thì trả suất
const retryOrGiveUp = async ({ data, error }) => {
  const job = await ManageQueue.findById(data.jobId);
  if (job && job.hit < 5) {
    return job.set({
      progress: "WAITING",
      hit: job.hit + 1,
      schedule: new Date(Date.now() + 2 ** job.hit * 1000),
      note: error.toString(),
    }).save();
  }
  await releaseSlot({ saleId: data.saleId, reservationId: data.reservationId });
  await ManageQueue.updateOne({ _id: data.jobId }, { progress: "ERROR", note: error.toString() });
};
```
Lỗi `11000` (duplicate reservationId) = đơn đã có → coi là SUCCESS.

## expire-reservation.js
```js
const released = await releaseSlot({ saleId, reservationId });
if (released) {
  await Order.updateOne(
    { "flashSale.reservationId": reservationId, isPaid: false },
    { status: ORDER_STATUS.CANCELLED }
  );
}
// SUCCESS / ERROR vào ManageQueue như các worker khác
```

## Xác nhận thanh toán — `POST /bizs/.../flash-sales/:id/reservations/:reservationId/paid`
```js
const ok = await confirmSlot({ saleId, reservationId });
if (!ok) return response(res, { status: 409, message: "Suất đã hết hạn giữ" });
await Order.updateOne({ bizId: biz.id, "flashSale.reservationId": reservationId }, { isPaid: true });
```
Hệ thống hiện chưa có luồng set `isPaid`, nên MVP dùng endpoint này (nhân viên / webhook thanh toán gọi).

**Case cần biết:** thanh toán chốt trước khi worker kịp tạo đơn → `confirmSlot` xoá resv → worker thấy `holding = false` và bỏ qua → **mất đơn**. Xử lý: endpoint `paid` trả 409 nếu đơn chưa tồn tại (`Order.exists` trước `confirmSlot`), client chỉ cho thanh toán khi status = `CREATED`.

## Todo
- [ ] `createOrderWithCode` trong helper (biz/partner controller có thể chuyển sang dùng sau, không bắt buộc)
- [ ] 2 worker + đăng ký bull.js
- [ ] Endpoint `paid` (check đơn tồn tại trước khi `confirmSlot`)

## Success
- Không thanh toán sau `holdMinutes` → đơn `cancelled`, stock Redis +qty, SĐT mua lại được.
- Thanh toán trong hạn → `isPaid: true`, job EXPIRE chạy xong không đổi gì.
- Chạy lại job CREATE_ORDER cùng reservationId → không tạo đơn thứ 2.
