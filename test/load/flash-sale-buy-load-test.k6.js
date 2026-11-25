/**
 * k6 load test cho flash-sale (phase 05). Chạy trên staging, KHÔNG chạy production.
 *
 * Biến môi trường:
 *  HOST       vd https://staging-api.example.com (gồm cả API_ROOT nếu có)
 *  BIZ        bizAlias
 *  SERVICE    giá trị env SERVICE của server
 *  TOKEN      JWT user có quyền trên biz (header Authorization)
 *  MODE       burst (mặc định) | same-phone
 *  SALE       id sale có sẵn; bỏ trống → setup() tự tạo sale mới
 *  PRODUCT    id sản phẩm dùng khi tự tạo sale (bắt buộc nếu không có SALE)
 *  QUANTITY   số suất khi tự tạo sale, mặc định 100
 *  HOLD       holdMinutes khi tự tạo sale, mặc định 2
 *
 * burst      : 2000 VU, 10000 request, mỗi request 1 SĐT khác nhau → kỳ vọng đúng QUANTITY lượt 202.
 * same-phone : 50 VU, 50 request, cùng 1 SĐT, limitPerUser = 1 → kỳ vọng đúng 1 lượt 202.
 *
 * Ví dụ:
 *  k6 run -e HOST=... -e BIZ=... -e SERVICE=... -e TOKEN=... -e PRODUCT=... test/load/flash-sale-buy-load-test.k6.js
 *  k6 run -e MODE=same-phone ... test/load/flash-sale-buy-load-test.k6.js
 * Sau đó chạy test/load/verify-flash-sale-load-test-state.mjs với saleId in ra ở teardown.
 */
import http from "k6/http";
import { check, fail } from "k6";
import { Counter } from "k6/metrics";

const MODE = __ENV.MODE || "burst";
const QUANTITY = Number(__ENV.QUANTITY || 100);
const HOLD = Number(__ENV.HOLD || 2);
const BASE = `${__ENV.HOST}/bizs/${__ENV.BIZ}/${__ENV.SERVICE}/flash-sales`;
const HEADERS = {
  "Content-Type": "application/json",
  Authorization: __ENV.TOKEN,
};

// Số lượt 202 kỳ vọng theo từng kịch bản
const EXPECTED_ACCEPTED = MODE === "same-phone" ? 1 : QUANTITY;
const FIXED_PHONE = "0900000001";

const accepted = new Counter("fs_accepted"); // 202
const rejected = new Counter("fs_rejected"); // 409
const serverErrors = new Counter("fs_server_errors"); // 5xx
const unexpected = new Counter("fs_unexpected"); // mã khác (401, 400...)

const SCENARIOS = {
  burst: { executor: "shared-iterations", vus: 2000, iterations: 10000, maxDuration: "60s" },
  "same-phone": { executor: "shared-iterations", vus: 50, iterations: 50, maxDuration: "30s" },
};
if (!SCENARIOS[MODE]) throw new Error(`MODE không hợp lệ: ${MODE}`);

export const options = {
  scenarios: { [MODE]: SCENARIOS[MODE] },
  // Fail threshold → k6 exit code != 0 → không merge
  thresholds: {
    fs_accepted: [`count==${EXPECTED_ACCEPTED}`],
    fs_server_errors: ["count==0"],
    fs_unexpected: ["count==0"],
    "http_req_duration{name:buy}": ["p(99)<300"],
  },
  setupTimeout: "60s",
};

/** Tạo sale mới (nếu chưa truyền SALE). Request này đồng thời warm cache token của biz. */
export function setup() {
  for (const key of ["HOST", "BIZ", "SERVICE", "TOKEN"]) {
    if (!__ENV[key]) fail(`Thiếu biến môi trường ${key}`);
  }
  if (__ENV.SALE) {
    const res = http.get(`${BASE}/${__ENV.SALE}`, { headers: HEADERS });
    if (res.status !== 200) fail(`Không đọc được sale ${__ENV.SALE}: ${res.status} ${res.body}`);
    return { saleId: __ENV.SALE };
  }
  if (!__ENV.PRODUCT) fail("Thiếu PRODUCT để tự tạo sale (hoặc truyền SALE)");

  const now = Date.now();
  const res = http.post(
    BASE,
    JSON.stringify({
      name: `k6-${MODE}-${now}`,
      item: { product: __ENV.PRODUCT, name: "k6 load test", price: 1000, originalPrice: 2000 },
      quantity: QUANTITY,
      limitPerUser: 1,
      holdMinutes: HOLD,
      // Lùi 5s để tránh lệch giờ app/Redis làm request đầu bị NOT_OPEN
      startAt: new Date(now - 5000).toISOString(),
      endAt: new Date(now + 30 * 60000).toISOString(),
    }),
    { headers: HEADERS }
  );
  if (res.status !== 201) fail(`Tạo sale lỗi: ${res.status} ${res.body}`);
  const saleId = res.json("data.id");
  if (!saleId) fail(`Không lấy được saleId: ${res.body}`);
  return { saleId };
}

/** SĐT duy nhất cho mỗi request trong burst (10 chữ số, đầu 09). */
const uniquePhone = () =>
  `09${String(__VU * 100000 + __ITER).padStart(8, "0").slice(-8)}`;

export default function ({ saleId }) {
  const phone = MODE === "same-phone" ? FIXED_PHONE : uniquePhone();
  const res = http.post(
    `${BASE}/${saleId}/buy`,
    JSON.stringify({ qty: 1, customer: { phone, name: "k6" } }),
    { headers: HEADERS, tags: { name: "buy" } }
  );

  if (res.status === 202) accepted.add(1);
  else if (res.status === 409) rejected.add(1);
  else if (res.status >= 500) serverErrors.add(1);
  else unexpected.add(1);

  check(res, { "202 hoặc 409": (r) => r.status === 202 || r.status === 409 });
}

export function teardown({ saleId }) {
  console.log(`SALE_ID=${saleId} MODE=${MODE} EXPECTED_ACCEPTED=${EXPECTED_ACCEPTED}`);
}
