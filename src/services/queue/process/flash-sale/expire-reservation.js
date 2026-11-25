import Order from "../../../../api/models/order";
import { ORDER_STATUS } from "../../../../api/biz/order/constants";
import { syncOrderToElastic } from "../../../elastic/order";
import { removeServiceCache } from "../../../cache";
import {
  confirmSlot,
  isReservationReleased,
  releaseSlot,
} from "../../../redis/flash-sale-scripts";

const CANCELLABLE_STATUS = [ORDER_STATUS.NEW, ORDER_STATUS.PENDING];
import { markJobSuccess, retryOrGiveUp } from "./flash-sale-job-retry";

/**
 * Hết `holdMinutes` mà chưa thanh toán → hoàn suất + huỷ đơn.
 * Đã thanh toán qua confirmPaid thì resv đã bị xoá → releaseSlot trả 0 và resv không nằm trong `released` → bỏ qua.
 *  @param { data }: { jobId, saleId, reservationId, bizId }
 */
export default function process(worker, concurrency = 1) {
  worker.process(concurrency, async (job, done) => {
    const { data } = job;
    const { saleId, reservationId, bizId } = data;
    try {
      // Đơn đã thanh toán / đã chuyển trạng thái qua luồng sửa đơn chung (không qua confirmPaid)
      // → chốt suất, không được hoàn, nếu không suất bị bán lại → bán lố
      const existing = await Order.findOne({
        "flashSale.reservationId": reservationId,
      });
      if (
        existing &&
        (existing.isPaid ||
          (!CANCELLABLE_STATUS.includes(existing.status) &&
            existing.status !== ORDER_STATUS.CANCELLED))
      ) {
        await confirmSlot({ saleId, reservationId });
        await markJobSuccess(data.jobId, "Đơn đã xử lý, chốt suất");
        return done();
      }

      await releaseSlot({ saleId, reservationId });

      // Check theo set `released` thay vì kết quả release để chạy lại (retry) vẫn huỷ được đơn
      if (await isReservationReleased({ saleId, reservationId })) {
        const order = await Order.findOneAndUpdate(
          {
            "flashSale.reservationId": reservationId,
            isPaid: false,
            status: { $in: CANCELLABLE_STATUS },
          },
          {
            status: ORDER_STATUS.CANCELLED,
            updatedBy: { id: "system", name: "system" },
          },
          { new: true }
        );
        if (order) {
          await syncOrderToElastic(order);
          await removeServiceCache({ req: { biz: { id: bizId } }, model: "order" });
        }
      }

      await markJobSuccess(data.jobId);
      done();
    } catch (error) {
      console.error("FLASH_SALE_EXPIRE error", error);
      await retryOrGiveUp({ data, error }).catch((e) =>
        console.error("FLASH_SALE_EXPIRE retry error", e)
      );
      done();
    }
  });
}
