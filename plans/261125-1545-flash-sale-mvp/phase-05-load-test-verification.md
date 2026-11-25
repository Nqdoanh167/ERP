# Phase 05 — Load test kiểm chứng

**Priority:** cao | **Status:** in-progress (script xong, chờ chạy staging) | **Depends:** 01–04

## Script
- `test/load/flash-sale-buy-load-test.k6.js`: k6, 2 kịch bản `burst` / `same-phone`, threshold tự fail.
- `test/load/verify-flash-sale-load-test-state.mjs`: đọc Redis + Mongo, poll đến khi đạt hoặc hết giờ chờ.

Endpoint: `POST {HOST}/bizs/:bizAlias/:SERVICE/flash-sales/:id/buy`, header `Authorization: <JWT user>`
(bản cũ ghi `/public/...` là sai, public API đã bỏ).

## Cách chạy (staging)
Sale tự tạo trong `setup()` nếu không truyền `SALE`: `quantity=100`, `limitPerUser=1`, `holdMinutes=2`.
`setup()` cũng là request đầu tiên → warm cache token.

```bash
# 1. Burst: 2000 VU, 10000 request, SĐT khác nhau
k6 run -e HOST=... -e BIZ=... -e SERVICE=... -e TOKEN=... -e PRODUCT=<productId> \
  test/load/flash-sale-buy-load-test.k6.js            # in SALE_ID ở teardown

# 2. Đợi queue tạo đơn xong rồi kiểm tra
MONGODB_URI=... REDIS_URI=... node test/load/verify-flash-sale-load-test-state.mjs \
  --sale=<SALE_ID> --stage=after-buy --wait=300

# 3. Sau holdMinutes (không thanh toán đơn nào)
MONGODB_URI=... REDIS_URI=... node test/load/verify-flash-sale-load-test-state.mjs \
  --sale=<SALE_ID> --stage=after-expire --wait=300

# 4. Cùng 1 SĐT x 50 request (sale mới)
k6 run -e MODE=same-phone -e HOST=... -e BIZ=... -e SERVICE=... -e TOKEN=... -e PRODUCT=... \
  test/load/flash-sale-buy-load-test.k6.js
node test/load/verify-flash-sale-load-test-state.mjs --sale=<SALE_ID> --stage=after-buy --expected=1
```

## Kiểm tra (k6 threshold / verify script tự đánh giá, exit code != 0 = trượt)
- [ ] Đúng 100 response `202`, còn lại `409`, 0 lỗi 5xx (k6: `fs_accepted`, `fs_server_errors`, `fs_unexpected`)
- [ ] Sau khi queue chạy xong: đúng 100 Order có `flashSale.id = SALE` (verify `after-buy`)
- [ ] `fs:{SALE}:stock` = 0 (verify `after-buy`)
- [ ] 1 SĐT cố định × 50 request → đúng 1 `202` (k6 `same-phone` + verify `--expected=1`)
- [ ] Đợi quá `holdMinutes` → 100 đơn `cancelled`, stock về 100 (verify `after-expire`)
- [ ] p99 `/buy` < 300ms (k6 threshold `http_req_duration{name:buy}`)

Không đạt → không merge.

## Lưu ý
- Máy chạy k6: 2000 VU cần `ulimit -n` đủ lớn; đặt cùng region với staging để p99 phản ánh server.
- Worker tạo đơn `concurrency: 1` → `after-buy` có thể cần vài phút, tăng `--wait` nếu cần.
- Đơn tạo từ k6 là dữ liệu rác trên staging, lọc theo `flashSale.id` để dọn.
