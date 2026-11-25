#!/usr/bin/env node
/**
 * Direct Node.js test runner for flash-sale Redis scripts
 * Chạy: npm run build && node test/run-flash-sale-tests.mjs (cần Redis localhost:6379)
 */

import { createClient } from 'redis';
import {
  reserveSlot,
  releaseSlot,
  confirmSlot,
  isReservationHolding,
  isReservationReleased,
  warmUpFlashSale,
  fsKeys,
  RESERVE_RESULT,
} from '../dist/services/redis/flash-sale-scripts.js';
import { normalizePhone } from '../dist/utils/common.js';

const redisClient = createClient({
  socket: { host: 'localhost', port: 6379 },
});

let testsPassed = 0;
let testsFailed = 0;

const assert = (condition, message) => {
  if (!condition) {
    console.error(`✗ FAIL: ${message}`);
    testsFailed++;
  } else {
    console.log(`✓ PASS: ${message}`);
    testsPassed++;
  }
};

const TEST_SALE_ID = `test-sale-${Date.now()}`;
const TEST_BIZ_ID = 'test-biz-001';

const cleanup = async () => {
  const k = fsKeys(TEST_SALE_ID);
  await redisClient.del([k.meta, k.stock, k.buyers, k.resv, k.released]).catch(() => {});
};

async function runTests() {
  try {
    console.log('Connecting to Redis...');
    await redisClient.connect();
    console.log('✓ Connected to Redis\n');

    console.log('=== Criterion 1: Concurrent reservations with stock limit ===');
    {
      await cleanup();
      const now = Date.now();
      const sale = {
        id: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        quantity: 100,
        limitPerUser: 1,
        startAt: new Date(now - 1000),
        endAt: new Date(now + 60000),
      };

      await warmUpFlashSale(sale);

      const promises = [];
      for (let i = 0; i < 200; i++) {
        const phone = `09${String(i).padStart(9, '0')}`;
        const reservationId = `resv-concurrent-${i}`;
        promises.push(
          reserveSlot({
            saleId: TEST_SALE_ID,
            bizId: TEST_BIZ_ID,
            buyer: phone,
            qty: 1,
            reservationId,
          })
        );
      }

      const results = await Promise.all(promises);
      const successful = results.filter(r => r >= 0);
      const soldOut = results.filter(r => r === RESERVE_RESULT.SOLD_OUT);

      assert(successful.length === 100, `200 concurrent requests: 100 successful (got ${successful.length})`);
      assert(soldOut.length === 100, `200 concurrent requests: 100 sold-out (got ${soldOut.length})`);
      assert(results[99] === 0, 'Last successful reservation has stock=0');

      const finalStock = await redisClient.get(fsKeys(TEST_SALE_ID).stock);
      assert(finalStock === '0', `Final stock is 0 (got ${finalStock})`);
    }

    console.log('\n=== Criterion 2: Limit per user enforcement ===');
    {
      await cleanup();
      const now = Date.now();
      const sale = {
        id: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        quantity: 100,
        limitPerUser: 1,
        startAt: new Date(now - 1000),
        endAt: new Date(now + 60000),
      };

      await warmUpFlashSale(sale);

      const phone = '0912345678';
      const result1 = await reserveSlot({
        saleId: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        buyer: phone,
        qty: 1,
        reservationId: 'resv-001',
      });

      const result2 = await reserveSlot({
        saleId: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        buyer: phone,
        qty: 1,
        reservationId: 'resv-002',
      });

      assert(result1 >= 0, 'First reservation succeeds');
      assert(result2 === RESERVE_RESULT.OVER_LIMIT, 'Second reservation with same phone fails with OVER_LIMIT');

      // Test limit=2, qty=2 then qty=1
      await cleanup();
      const sale2 = {
        id: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        quantity: 100,
        limitPerUser: 2,
        startAt: new Date(now - 1000),
        endAt: new Date(now + 60000),
      };

      await warmUpFlashSale(sale2);

      const result3 = await reserveSlot({
        saleId: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        buyer: phone,
        qty: 2,
        reservationId: 'resv-003',
      });

      const result4 = await reserveSlot({
        saleId: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        buyer: phone,
        qty: 1,
        reservationId: 'resv-004',
      });

      assert(result3 >= 0, 'Buy qty=2 with limit=2 succeeds');
      assert(result4 === RESERVE_RESULT.OVER_LIMIT, 'Buy qty=1 more fails (would exceed limit=2)');
    }

    console.log('\n=== Criterion 3: Window and sale existence validation ===');
    {
      const now = Date.now();

      // Wrong bizId
      await cleanup();
      const sale = {
        id: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        quantity: 100,
        limitPerUser: 1,
        startAt: new Date(now - 1000),
        endAt: new Date(now + 60000),
      };

      await warmUpFlashSale(sale);

      const result1 = await reserveSlot({
        saleId: TEST_SALE_ID,
        bizId: 'wrong-biz',
        buyer: '0912345678',
        qty: 1,
        reservationId: 'resv-001',
      });
      assert(result1 === RESERVE_RESULT.NOT_READY, 'Wrong bizId returns NOT_READY (-4)');

      // Missing meta
      await cleanup();
      const result2 = await reserveSlot({
        saleId: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        buyer: '0912345678',
        qty: 1,
        reservationId: 'resv-002',
      });
      assert(result2 === RESERVE_RESULT.NOT_READY, 'Missing meta returns NOT_READY (-4)');

      // Window not started
      await cleanup();
      const sale3 = {
        id: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        quantity: 100,
        limitPerUser: 1,
        startAt: new Date(now + 60000),
        endAt: new Date(now + 120000),
      };
      await warmUpFlashSale(sale3);

      const result3 = await reserveSlot({
        saleId: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        buyer: '0912345678',
        qty: 1,
        reservationId: 'resv-003',
      });
      assert(result3 === RESERVE_RESULT.NOT_OPEN, 'Window not started returns NOT_OPEN (-3)');

      // Window ended
      await cleanup();
      const sale4 = {
        id: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        quantity: 100,
        limitPerUser: 1,
        startAt: new Date(now - 120000),
        endAt: new Date(now - 60000),
      };
      await warmUpFlashSale(sale4);

      const result4 = await reserveSlot({
        saleId: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        buyer: '0912345678',
        qty: 1,
        reservationId: 'resv-004',
      });
      assert(result4 === RESERVE_RESULT.NOT_OPEN, 'Window ended returns NOT_OPEN (-3)');
    }

    console.log('\n=== Criterion 4: Release slot idempotency ===');
    {
      await cleanup();
      const now = Date.now();
      const sale = {
        id: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        quantity: 100,
        limitPerUser: 2,
        startAt: new Date(now - 1000),
        endAt: new Date(now + 60000),
      };

      await warmUpFlashSale(sale);

      const phone = '0912345678';
      const reservationId = 'resv-001';

      await reserveSlot({
        saleId: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        buyer: phone,
        qty: 2,
        reservationId,
      });

      const released1 = await releaseSlot({
        saleId: TEST_SALE_ID,
        reservationId,
      });

      const released2 = await releaseSlot({
        saleId: TEST_SALE_ID,
        reservationId,
      });

      assert(released1 === 2, 'First release returns qty=2');
      assert(released2 === 0, 'Second release returns 0 (idempotent)');

      const stock = await redisClient.get(fsKeys(TEST_SALE_ID).stock);
      assert(stock === '100', `Stock restored to 100 (got ${stock})`);

      const result = await reserveSlot({
        saleId: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        buyer: phone,
        qty: 2,
        reservationId: 'resv-002',
      });
      assert(result >= 0, 'Same phone can reserve again after release');

      const isReleased = await isReservationReleased({
        saleId: TEST_SALE_ID,
        reservationId,
      });
      assert(isReleased === true, 'isReservationReleased returns true after release');
    }

    console.log('\n=== Criterion 5: Confirm then release ===');
    {
      await cleanup();
      const now = Date.now();
      const sale = {
        id: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        quantity: 100,
        limitPerUser: 1,
        startAt: new Date(now - 1000),
        endAt: new Date(now + 60000),
      };

      await warmUpFlashSale(sale);

      const phone = '0912345678';
      const reservationId = 'resv-001';

      await reserveSlot({
        saleId: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        buyer: phone,
        qty: 1,
        reservationId,
      });

      const confirmed = await confirmSlot({
        saleId: TEST_SALE_ID,
        reservationId,
      });
      assert(confirmed === 1, 'confirmSlot returns 1 on success');

      const holdingAfter = await isReservationHolding({
        saleId: TEST_SALE_ID,
        reservationId,
      });
      assert(holdingAfter === false, 'isReservationHolding returns false after confirm');

      const released = await releaseSlot({
        saleId: TEST_SALE_ID,
        reservationId,
      });
      assert(released === 0, 'releaseSlot after confirm returns 0');

      const isReleased = await isReservationReleased({
        saleId: TEST_SALE_ID,
        reservationId,
      });
      assert(isReleased === false, 'isReservationReleased returns false after confirm');

      const finalStock = await redisClient.get(fsKeys(TEST_SALE_ID).stock);
      assert(finalStock === '99', `Stock not restored after confirm (got ${finalStock})`);
    }

    console.log('\n=== Criterion 6: Warm-up idempotency ===');
    {
      await cleanup();
      const now = Date.now();
      const sale = {
        id: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        quantity: 100,
        limitPerUser: 10, // Allow reserving 10 items to test stock changes
        startAt: new Date(now - 1000),
        endAt: new Date(now + 60000),
      };

      await warmUpFlashSale(sale);

      await reserveSlot({
        saleId: TEST_SALE_ID,
        bizId: TEST_BIZ_ID,
        buyer: '0912345678',
        qty: 10,
        reservationId: 'resv-001',
      });

      let stock = await redisClient.get(fsKeys(TEST_SALE_ID).stock);
      assert(stock === '90', `Stock after reserve is 90 (got ${stock})`);

      await warmUpFlashSale(sale);

      stock = await redisClient.get(fsKeys(TEST_SALE_ID).stock);
      assert(stock === '90', `Stock unchanged after second warm-up (got ${stock})`);
    }

    console.log('\n=== Criterion 7: normalizePhone function ===');
    {
      assert(normalizePhone('+84 912 345 678') === '0912345678', 'Convert +84 with spaces to 0');
      assert(normalizePhone('0912345678') === '0912345678', 'Accept normalized phone');
      assert(normalizePhone('') === null, 'Empty string returns null');
      assert(normalizePhone('abc') === null, 'Non-phone string returns null');
      assert(normalizePhone('123') === null, 'Short number returns null');
      assert(normalizePhone('+84 (912) 345-678') === '0912345678', 'Handle various +84 formats');
      assert(normalizePhone('84 912 345 678') === '0912345678', 'Handle 84 without +');
    }

    console.log('\n=== Summary ===');
    console.log(`✓ Passed: ${testsPassed}`);
    console.log(`✗ Failed: ${testsFailed}`);

    await cleanup();
    await redisClient.quit();

    process.exit(testsFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test error:', error);
    await redisClient.quit().catch(() => {});
    process.exit(1);
  }
}

runTests();
