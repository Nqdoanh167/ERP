#!/usr/bin/env node
/**
 * Kiểm chứng trạng thái Redis + Mongo sau k6 load test flash-sale (phase 05).
 * Poll đến khi mọi điều kiện đạt hoặc hết thời gian chờ (worker tạo đơn chạy concurrency 1 nên cần đợi).
 *
 * Chạy:
 *  MONGODB_URI=... REDIS_URI=... node test/load/verify-flash-sale-load-test-state.mjs \
 *    --sale=<SALE_ID> --stage=after-buy|after-expire [--expected=100] [--wait=120]
 *
 *  after-buy    : ngay sau k6, đợi queue tạo đơn xong
 *                 → stock = quantity - expected, đúng `expected` đơn chưa huỷ, resv còn `expected` suất giữ
 *  after-expire : sau holdMinutes (không thanh toán đơn nào)
 *                 → stock = quantity, `expected` đơn cancelled, resv rỗng, released có `expected` phần tử
 *
 * Exit code 0 = đạt, 1 = không đạt / lỗi.
 */
import mongoose from "mongoose";
import { createClient } from "redis";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.join("=")];
  })
);

const SALE = args.sale;
const STAGE = args.stage;
const WAIT_SECONDS = Number(args.wait || 120);
const POLL_MS = 2000;

if (!SALE || !["after-buy", "after-expire"].includes(STAGE)) {
  console.error("Dùng: --sale=<id> --stage=after-buy|after-expire [--expected=N] [--wait=giây]");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("Thiếu MONGODB_URI");
  process.exit(1);
}

// Cùng format key với src/services/redis/flash-sale-scripts.js (fsKeys)
const keys = {
  stock: `fs:{${SALE}}:stock`,
  resv: `fs:{${SALE}}:resv`,
  released: `fs:{${SALE}}:released`,
};

const redis = createClient(
  process.env.REDIS_URI
    ? { url: process.env.REDIS_URI }
    : { socket: { host: process.env.REDIS_HOST || "localhost", port: Number(process.env.REDIS_PORT || 6379) } }
);

/** Đọc 1 lần toàn bộ số liệu cần so sánh. */
const snapshot = async (db) => {
  const orders = db.collection("orders");
  const [stock, resv, released, total, cancelled, paid] = await Promise.all([
    redis.get(keys.stock),
    redis.hLen(keys.resv),
    redis.sCard(keys.released),
    orders.countDocuments({ "flashSale.id": SALE }),
    orders.countDocuments({ "flashSale.id": SALE, status: "cancelled" }),
    orders.countDocuments({ "flashSale.id": SALE, isPaid: true }),
  ]);
  return { stock: Number(stock ?? NaN), resv, released, total, cancelled, paid };
};

/** Danh sách [tên, giá trị thực, giá trị kỳ vọng] cho từng stage. */
const buildChecks = (s, quantity, expected) =>
  STAGE === "after-buy"
    ? [
        ["redis stock", s.stock, quantity - expected],
        ["redis resv (đang giữ)", s.resv, expected],
        ["mongo đơn của sale", s.total, expected],
        ["mongo đơn cancelled", s.cancelled, 0],
      ]
    : [
        ["redis stock (đã hoàn)", s.stock, quantity],
        ["redis resv (đang giữ)", s.resv, 0],
        ["redis released", s.released, expected],
        ["mongo đơn của sale", s.total, expected],
        ["mongo đơn cancelled", s.cancelled, expected],
        ["mongo đơn đã thanh toán", s.paid, 0],
      ];

const main = async () => {
  // mongoose 5.x: bật parser/topology mới, fail nhanh nếu không kết nối được
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
  });
  await redis.connect();
  const db = mongoose.connection.db;

  const sale = await db
    .collection("flashsales")
    .findOne({ _id: new mongoose.Types.ObjectId(SALE) });
  if (!sale) throw new Error(`Không tìm thấy FlashSale ${SALE}`);
  const quantity = sale.quantity;
  const expected = Number(args.expected || quantity);

  const deadline = Date.now() + WAIT_SECONDS * 1000;
  let checks;
  for (;;) {
    checks = buildChecks(await snapshot(db), quantity, expected);
    if (checks.every(([, actual, want]) => actual === want)) break;
    if (Date.now() > deadline) break;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  let ok = true;
  for (const [name, actual, want] of checks) {
    const pass = actual === want;
    ok = ok && pass;
    console.log(`${pass ? "PASS" : "FAIL"}  ${name}: ${actual} (kỳ vọng ${want})`);
  }
  console.log(ok ? `\nĐẠT (${STAGE})` : `\nKHÔNG ĐẠT (${STAGE}) sau ${WAIT_SECONDS}s chờ`);
  return ok;
};

main()
  .then((ok) => (process.exitCode = ok ? 0 : 1))
  .catch((error) => {
    console.error("Lỗi kiểm chứng:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await redis.quit().catch(() => {});
    await mongoose.disconnect().catch(() => {});
  });
