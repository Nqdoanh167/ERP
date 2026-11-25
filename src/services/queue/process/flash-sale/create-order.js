import FlashSale from "../../../../api/models/flashSale";
import Order from "../../../../api/models/order";
import { createOrderWithCode } from "../../../../api/biz/order/helper";
import { ORDER_STATUS } from "../../../../api/biz/order/constants";
import { syncOrderToElastic } from "../../../elastic/order";
import { removeServiceCache } from "../../../cache";
import {
  isReservationHolding,
  isReservationReleased,
  releaseSlot,
} from "../../../redis/flash-sale-scripts";
import { markJobSuccess, retryOrGiveUp } from "./flash-sale-job-retry";

const isDuplicateReservation = (error) =>
  error?.code === 11000 &&
  (error.keyPattern?.["flashSale.reservationId"] ||
    String(error.message).includes("flashSale.reservationId"));

/**
 * Tạo đơn cho 1 suất flash-sale đã giữ thành công.
 * concurrency phải = 1: sinh `nid` hiện tại race khi chạy song song.
 *  @param { data }: { jobId, saleId, reservationId, qty, orderInfo, bizId }
 */
export default function process(worker, concurrency = 1) {
  worker.process(concurrency, async (job, done) => {
    const { data } = job;
    const { saleId, reservationId, qty, orderInfo, bizId } = data;
    try {
      let order = await Order.findOne({
        "flashSale.reservationId": reservationId,
      });
      // Không còn giữ = đã hết hạn / bị hoàn → bỏ qua
      const holding = await isReservationHolding({ saleId, reservationId });

      if (!order && holding) {
        const sale = await FlashSale.findById(saleId);
        if (!sale) throw new Error(`FlashSale ${saleId} not found`);

        const { item } = sale.toObject();
        const amount = item.price * qty;
        order = await createOrderWithCode({
          bizId,
          updatedBy: { id: "system", name: "system" },
          body: {
            ...orderInfo,
            cart: [
              { ...item, realPrice: item.price, quantity: qty, amount },
            ],
            cartTotalAmount: amount,
            totalAmount: amount,
            note: [orderInfo.note, sale.name && `Flash-sale: ${sale.name}`]
              .filter(Boolean)
              .join(" - "),
            flashSale: { id: saleId, reservationId },
          },
        });
      }

      // Job EXPIRE chạy ở queue khác, có thể đã hoàn suất trong lúc đang tạo đơn → huỷ.
      // Chạy cả khi đơn đã có sẵn (retry sau lỗi giữa chừng) để không sót.
      if (
        order &&
        !order.isPaid &&
        [ORDER_STATUS.NEW, ORDER_STATUS.PENDING].includes(order.status) &&
        (await isReservationReleased({ saleId, reservationId }))
      ) {
        order.status = ORDER_STATUS.CANCELLED;
        await order.save();
      }

      if (order) {
        await syncOrderToElastic(order);
        await removeServiceCache({ req: { biz: { id: bizId } }, model: "order" });
      }

      await markJobSuccess(data.jobId, order ? undefined : "Suất đã hết hạn giữ");
      done();
    } catch (error) {
      console.error("FLASH_SALE_CREATE_ORDER error", error);
      if (isDuplicateReservation(error)) {
        await markJobSuccess(data.jobId).catch(() => {});
        return done();
      }
      await retryOrGiveUp({
        data,
        error,
        // Không tạo được đơn → trả suất cho người khác
        onGiveUp: () => releaseSlot({ saleId, reservationId }),
      }).catch((e) => console.error("FLASH_SALE_CREATE_ORDER retry error", e));
      done();
    }
  });
}
