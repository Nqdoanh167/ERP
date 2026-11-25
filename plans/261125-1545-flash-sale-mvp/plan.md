---
title: Flash-sale MVP
status: in-progress
created: 2025-11-25
blockedBy: []
blocks: []
---

# Flash-sale MVP

Bài toán: ~10k request đồng thời, chỉ bán N suất (vd 100). Không bán lố, giới hạn mỗi SĐT, giữ suất chờ thanh toán N phút.

## Quyết định
- Cổng chống bán lố: **1 Lua script Redis** (check giờ + limit/SĐT + tồn kho + trừ kho, atomic).
- Mua qua **biz API** (`token`), limit theo `customer.phone`. (Đã bỏ public/partner API.)
- Tạo đơn **bất đồng bộ** qua **ManageQueue** (outbox sẵn có), worker `concurrency: 1` vì sinh `nid` hiện tại không an toàn khi song song.
- Giữ suất: job `FLASH_SALE_EXPIRE` với `schedule = now + holdMinutes`. Thanh toán vs hết hạn tranh nhau 1 lệnh `HDEL` → chỉ 1 bên thắng.

## Cố ý KHÔNG làm (YAGNI, để sau)
Cờ sold-out in-memory, rate limit, Mongo stock làm lưới an toàn, Redis Cluster, chống bot, sửa cách sinh `nid`.

## Phases
| # | Phase | Status |
|---|-------|--------|
| 01 | [Model + Redis Lua](phase-01-flash-sale-model-and-redis-scripts.md) | done |
| 02 | [Biz API tạo flash-sale + warm-up](phase-02-biz-api-create-flash-sale.md) | done |
| 03 | [Biz API mua + xem trạng thái](phase-03-public-api-buy-and-status.md) | done |
| 04 | [Workers tạo đơn / hết hạn + xác nhận thanh toán](phase-04-queue-workers-and-paid-confirm.md) | done |
| 05 | [Load test kiểm chứng](phase-05-load-test-verification.md) | pending |

## Luồng
```
POST /bizs/.../flash-sales/:id/buy
  → Lua RESERVE ─ fail → 409
  → ManageQueue.create [CREATE_ORDER (now), EXPIRE (now+hold)] ─ fail → Lua RELEASE → 500
  → 202 { reservationId }
Worker CREATE_ORDER: đơn đã có? → xong | resv còn giữ? → tạo Order(flashSale.reservationId unique)
POST /bizs/.../flash-sales/:id/reservations/:rid/paid → HDEL resv: 1 → isPaid=true | 0 → 409 đã hết hạn
Worker EXPIRE: Lua RELEASE: 1 → huỷ đơn chưa thanh toán | 0 → đã thanh toán, bỏ qua
```

## Yêu cầu hạ tầng
Redis ≥ 5 (Lua dùng `TIME` trước lệnh ghi). Nên bật AOF.

## Rủi ro chính
- Redis mất dữ liệu giữa sale → có thể bán lố (chưa có lưới Mongo). Chấp nhận cho MVP, bật AOF.
- `refreshJob.js:28` dùng `createdAt` → job EXPIRE có thể chạy lặp. Worker idempotent nên an toàn.
