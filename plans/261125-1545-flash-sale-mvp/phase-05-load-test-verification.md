# Phase 05 — Load test kiểm chứng

**Priority:** cao | **Status:** pending | **Depends:** 01–04

## Kịch bản (k6, môi trường staging)
Sale: `quantity = 100`, `limitPerUser = 1`, `holdMinutes = 2`.

```js
import http from "k6/http";
export const options = {
  scenarios: { burst: { executor: "shared-iterations", vus: 2000, iterations: 10000, maxDuration: "60s" } },
};
export default function () {
  const phone = `09${String(__VU * 100000 + __ITER).padStart(8, "0")}`;
  http.post(
    `${__ENV.HOST}/public/bizs/${__ENV.BIZ}/${__ENV.SERVICE}/flash-sales/${__ENV.SALE}/buy`,
    JSON.stringify({ qty: 1, customer: { phone, name: "k6" } }),
    { headers: { "Content-Type": "application/json", Authorization: __ENV.BIZ_TOKEN } }
  );
}
```
Chạy 1 request trước để warm cache `bizToken`.

## Kiểm tra
- [ ] Đúng 100 response `202`, còn lại `409`, 0 lỗi 5xx
- [ ] Sau khi queue chạy xong: đúng 100 Order có `flashSale.id = SALE`
- [ ] `fs:{SALE}:stock` = 0
- [ ] Chạy lại với 1 SĐT cố định × 50 request → đúng 1 `202`
- [ ] Đợi quá `holdMinutes` → 100 đơn `cancelled`, stock về 100
- [ ] p99 `/buy` < 300ms

Không đạt → không merge.
