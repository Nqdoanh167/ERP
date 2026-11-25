import { redisClient } from "./index";

/**
 * Bộ Redis key của 1 flash-sale.
 * Hash tag `{saleId}`: Redis Cluster chỉ băm phần trong `{}` → mọi key của cùng sale nằm 1 slot,
 * nhờ vậy script Lua (RESERVE_LUA / RELEASE_LUA) truy cập nhiều key vẫn chạy được trên Cluster.
 */
export const fsKeys = (saleId) => ({
  /**
   * meta: HASH { bizId, startAt, endAt, limitPerUser } (thời gian dạng ms epoch, lưu string).
   * Ghi bởi: warmUpFlashSale (HSET, ghi đè được để sửa giờ/limit).
   * Mục đích: cấu hình sale đọc ngay trong Lua, không phải query DB mỗi lượt mua.
   *  - bizId: chặn token của biz khác mua sale này (sai → NOT_READY).
   *  - startAt/endAt: so với Redis TIME để chặn mua ngoài khung giờ (NOT_OPEN).
   *  - limitPerUser: giới hạn số suất mỗi SĐT (OVER_LIMIT).
   * Chưa có meta = sale chưa warm-up → mọi lượt mua trả NOT_READY.
   */
  meta: `fs:{${saleId}}:meta`,

  /**
   * stock: STRING số nguyên = số suất còn lại có thể giữ.
   * Ghi bởi: warmUpFlashSale (SET NX, không reset khi gọi lại), RESERVE (DECRBY), RELEASE (INCRBY).
   * Mục đích: nguồn sự thật duy nhất về tồn kho flash-sale; check + trừ trong 1 script → không bán lố.
   * Lưu ý: suất đã confirm KHÔNG cộng lại; suất đang giữ đã bị trừ sẵn.
   */
  stock: `fs:{${saleId}}:stock`,

  /**
   * buyers: HASH phone -> tổng qty (đang giữ + đã thanh toán) của người mua đó.
   * Ghi bởi: RESERVE (HINCRBY +qty), RELEASE (HINCRBY -qty, về <= 0 thì HDEL field).
   * Mục đích: đếm quota theo người để áp limitPerUser. Confirm không đụng tới vì suất đã mua vẫn tính quota.
   */
  buyers: `fs:{${saleId}}:buyers`,

  /**
   * resv: HASH reservationId -> "phone|qty".
   * Ghi bởi: RESERVE (HSET); bị xoá bởi confirmSlot (HDEL, đã thanh toán) hoặc RELEASE (HDEL, hoàn suất).
   * Mục đích:
   *  - Danh sách suất ĐANG GIỮ chưa thanh toán; lưu kèm phone|qty để RELEASE biết hoàn stock/quota cho ai, bao nhiêu.
   *  - Là "điểm tranh chấp" duy nhất giữa confirm và release: ai HDEL trước thắng (HDEL trả 1),
   *    bên sau nhận 0 → không bao giờ vừa chốt vừa hoàn cùng 1 reservation, không cần lock.
   */
  resv: `fs:{${saleId}}:resv`,

  /**
   * released: SET các reservationId đã bị hoàn suất (hết hạn giữ / lỗi tạo đơn).
   * Ghi bởi: RELEASE (SADD).
   * Mục đích: khi reservationId đã rời `resv`, phân biệt được 2 trường hợp:
   *  - có trong released → đã bị hoàn (thanh toán đến muộn → cần refund/báo hết hạn).
   *  - không có → đã thanh toán (confirm) thành công.
   * Dùng bởi isReservationReleased, worker expire-reservation.
   */
  released: `fs:{${saleId}}:released`,
});

export const RESERVE_RESULT = {
  SOLD_OUT: -1,
  OVER_LIMIT: -2,
  NOT_OPEN: -3,
  NOT_READY: -4,
};

// Toàn bộ check + trừ kho trong 1 script → atomic, không bán lố.
// bizId sai cũng trả NOT_READY để bizToken của biz khác không mua được sale này.
const RESERVE_LUA = `
local meta = redis.call('HMGET', KEYS[1], 'bizId', 'startAt', 'endAt', 'limitPerUser')
if not meta[1] or meta[1] ~= ARGV[4] then return -4 end
local t = redis.call('TIME')
local now = tonumber(t[1]) * 1000 + math.floor(tonumber(t[2]) / 1000)
if now < tonumber(meta[2]) or now > tonumber(meta[3]) then return -3 end
local qty = tonumber(ARGV[2])
local bought = tonumber(redis.call('HGET', KEYS[3], ARGV[1]) or '0')
if bought + qty > tonumber(meta[4]) then return -2 end
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
redis.call('SADD', KEYS[4], ARGV[1])
local sep = string.find(v, '|', 1, true)
local buyer = string.sub(v, 1, sep - 1)
local qty = tonumber(string.sub(v, sep + 1))
redis.call('INCRBY', KEYS[1], qty)
if redis.call('HINCRBY', KEYS[2], buyer, -qty) <= 0 then redis.call('HDEL', KEYS[2], buyer) end
return qty
`;

/**
 * Giữ 1 suất. Trả về số suất còn lại (>= 0) nếu thành công, hoặc 1 giá trị âm trong RESERVE_RESULT.
 */
export const reserveSlot = ({ saleId, bizId, buyer, qty, reservationId }) => {
  const k = fsKeys(saleId);
  return redisClient.eval(RESERVE_LUA, {
    keys: [k.meta, k.stock, k.buyers, k.resv],
    arguments: [
      String(buyer),
      String(qty),
      String(reservationId),
      String(bizId),
    ],
  });
};

/** Hoàn suất. Trả về qty đã hoàn, 0 nếu resv không còn giữ. */
export const releaseSlot = ({ saleId, reservationId }) => {
  const k = fsKeys(saleId);
  return redisClient.eval(RELEASE_LUA, {
    keys: [k.stock, k.buyers, k.resv, k.released],
    arguments: [String(reservationId)],
  });
};

/** Chốt suất khi thanh toán: 1 = thành công | 0 = đã hết hạn (đã bị hoàn) */
export const confirmSlot = ({ saleId, reservationId }) =>
  redisClient.hDel(fsKeys(saleId).resv, String(reservationId));

export const isReservationHolding = ({ saleId, reservationId }) =>
  redisClient.hExists(fsKeys(saleId).resv, String(reservationId));

export const isReservationReleased = ({ saleId, reservationId }) =>
  redisClient.sIsMember(fsKeys(saleId).released, String(reservationId));

export const getFlashSaleStock = async (saleId) =>
  Number((await redisClient.get(fsKeys(saleId).stock)) ?? 0);

/** Nạp sale vào Redis. Stock dùng NX để gọi lại không reset số suất đã bán. */
export const warmUpFlashSale = async (sale) => {
  const k = fsKeys(sale.id);
  await redisClient.set(k.stock, String(sale.quantity), { NX: true });
  await redisClient.hSet(k.meta, {
    bizId: String(sale.bizId),
    startAt: String(+sale.startAt),
    endAt: String(+sale.endAt),
    limitPerUser: String(sale.limitPerUser),
  });
};
