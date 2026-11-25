# Phase 01 — Model + Redis Lua

**Priority:** cao | **Status:** done

## Files
- Tạo: `src/api/models/flashSale.js`
- Sửa: `src/api/models/order.js` (thêm field `flashSale` + index)
- Tạo: `src/services/redis/flash-sale-scripts.js`

## 1. Model `FlashSale`
```js
const flashSaleSchema = new Schema(
  {
    bizId: { type: String, required: true, index: true },
    name: String,
    item: { product: String, sku: String, name: String, picture: String, originalPrice: Number, price: Number },
    quantity: { type: Number, required: true, min: 1 },
    limitPerUser: { type: Number, default: 1, min: 1 },
    holdMinutes: { type: Number, default: 10, min: 1 },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
  },
  { timestamps: true, toJSON: { virtuals: true, transform: (o, r) => { delete r._id } } }
);
```
Có `view()` + export `flashSaleCreateModel` theo convention của `order.js`.

## 2. Order
```js
flashSale: { id: String, reservationId: String },

orderSchema.index(
  { "flashSale.reservationId": 1 },
  { unique: true, partialFilterExpression: { "flashSale.reservationId": { $exists: true } } }
);
```
Thêm `flashSale` vào `view()`.

## 3. Redis keys
```
fs:{saleId}:meta    HASH  startAt, endAt (ms), limitPerUser
fs:{saleId}:stock   INT
fs:{saleId}:buyers  HASH  phone → qty
fs:{saleId}:resv    HASH  reservationId → "phone|qty"   (đang giữ, chưa thanh toán)
```

## 4. `flash-sale-scripts.js`
```js
import { redisClient } from "./index";

export const fsKeys = (saleId) => ({
  meta: `fs:{${saleId}}:meta`,
  stock: `fs:{${saleId}}:stock`,
  buyers: `fs:{${saleId}}:buyers`,
  resv: `fs:{${saleId}}:resv`,
});

export const RESERVE_RESULT = { SOLD_OUT: -1, OVER_LIMIT: -2, NOT_OPEN: -3, NOT_READY: -4 };

// Toàn bộ check + trừ kho trong 1 script → atomic, không bán lố
const RESERVE_LUA = `
local meta = redis.call('HMGET', KEYS[1], 'startAt', 'endAt', 'limitPerUser')
if not meta[1] then return -4 end
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
if now < tonumber(meta[1]) or now > tonumber(meta[2]) then return -3 end
local qty = tonumber(ARGV[2])
local bought = tonumber(redis.call('HGET', KEYS[3], ARGV[1]) or '0')
if bought + qty > tonumber(meta[3]) then return -2 end
local stock = tonumber(redis.call('GET', KEYS[2]) or '0')
if stock < qty then return -1 end
redis.call('DECRBY', KEYS[2], qty)
redis.call('HINCRBY', KEYS[3], ARGV[1], qty)
redis.call('HSET', KEYS[4], ARGV[3], ARGV[1] .. '|' .. qty)
return stock - qty
`;

// Idempotent: resv không còn (đã thanh toán / đã hoàn) → 0
const RELEASE_LUA = `
local v = redis.call('HGET', KEYS[3], ARGV[1])
if not v then return 0 end
redis.call('HDEL', KEYS[3], ARGV[1])
local sep = string.find(v, '|', 1, true)
local buyer = string.sub(v, 1, sep - 1)
local qty = tonumber(string.sub(v, sep + 1))
redis.call('INCRBY', KEYS[1], qty)
if redis.call('HINCRBY', KEYS[2], buyer, -qty) <= 0 then redis.call('HDEL', KEYS[2], buyer) end
return qty
`;

export const reserveSlot = ({ saleId, buyer, qty, reservationId }) => {
  const k = fsKeys(saleId);
  return redisClient.eval(RESERVE_LUA, {
    keys: [k.meta, k.stock, k.buyers, k.resv],
    arguments: [String(buyer), String(qty), String(reservationId)],
  });
};

export const releaseSlot = ({ saleId, reservationId }) => {
  const k = fsKeys(saleId);
  return redisClient.eval(RELEASE_LUA, {
    keys: [k.stock, k.buyers, k.resv],
    arguments: [String(reservationId)],
  });
};

// 1 = chốt thành công | 0 = đã hết hạn
export const confirmSlot = ({ saleId, reservationId }) =>
  redisClient.hDel(fsKeys(saleId).resv, String(reservationId));

export const isReservationHolding = ({ saleId, reservationId }) =>
  redisClient.hExists(fsKeys(saleId).resv, String(reservationId));

export const warmUpFlashSale = async (sale) => {
  const k = fsKeys(sale.id);
  await redisClient.set(k.stock, String(sale.quantity), { NX: true });
  await redisClient.hSet(k.meta, {
    startAt: String(+sale.startAt),
    endAt: String(+sale.endAt),
    limitPerUser: String(sale.limitPerUser),
  });
};
```

## Todo
- [x] Model FlashSale + `flashSaleCreateModel`
- [x] Order: field `flashSale`, partial unique index, `view()`
- [x] `flash-sale-scripts.js`
- [x] Kiểm tra version Redis ≥ 5

## Success
- `reserveSlot` gọi 200 lần song song với stock=100 → đúng 100 kết quả ≥ 0.
- Gọi `releaseSlot` 2 lần cùng resv → lần 2 trả 0.

## Lưu ý
- `normalize phone` (bỏ khoảng trắng, `+84` → `0`) trước khi làm key buyer, nếu không user lách limit bằng cách đổi format SĐT.
