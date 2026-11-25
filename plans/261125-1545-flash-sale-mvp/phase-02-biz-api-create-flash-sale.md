# Phase 02 — Biz API tạo flash-sale + warm-up

**Priority:** cao | **Status:** pending | **Depends:** 01

## Files
- Tạo: `src/api/biz/flash-sale/index.js`, `src/api/biz/flash-sale/controller.js`
- Sửa: `src/api/biz/index.js` — mount `router.use("/flash-sales", flashSale)` **trước** `router.use("/", order)`

## Endpoints (`/bizs/:bizAlias/{service}/flash-sales`, `token` sẵn có)
| Method | Path | Việc |
|---|---|---|
| POST | `/` | Tạo FlashSale + `warmUpFlashSale` |
| GET | `/:id` | Xem sale + `stock` còn lại trong Redis |

## create
```js
const sale = await FlashSale.create({ ...body, bizId: biz.id });
await warmUpFlashSale(sale);
```
Validate: `endAt > startAt`, `quantity ≥ 1`. Không cho sửa sau khi tạo (MVP) — muốn đổi thì tạo sale mới.

## show
```js
const stock = await redisClient.get(fsKeys(sale.id).stock);
response(res, { data: { ...sale.view(true), stock: Number(stock ?? 0) } });
```

## Todo
- [ ] Router + controller theo style `src/api/biz/order`
- [ ] Mount route trước order router

## Success
- Tạo sale → Redis có `fs:{id}:stock` = quantity và `fs:{id}:meta`.
