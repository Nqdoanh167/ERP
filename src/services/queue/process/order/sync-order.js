import ManageQueue from "../../../../api/models/manageQueue";
import Order from "../../../../api/models/order";
import { syncMultiOrderToElastic } from "../../../elastic/order";

export default function process(worker, concurrency = 1) {
  worker.process(concurrency, async (job, done) => {
    const { data } = job;
    try {
      console.log("🔄 Bắt đầu sync orders to Elasticsearch...");

      const query = {};

      if (data.bizId) {
        query.bizId = data.bizId;
      }

      const total = await Order.countDocuments(query);
      console.log(`📊 Tổng số orders cần sync: ${total}`);

      let synced = 0;
      const BATCH_SIZE = 50;
      let lastSyncedId = null;

      while (true) {
        const cursorQuery = { ...query };
        if (lastSyncedId) {
          cursorQuery._id = { $gt: lastSyncedId };
        }

        const orders = await Order.find(cursorQuery)
          .sort({ _id: 1 })
          .limit(BATCH_SIZE);

        if (orders.length === 0) break;

        await syncMultiOrderToElastic({
          orders: [...orders],
        });

        synced += orders.length;
        lastSyncedId = orders[orders.length - 1]._id;
      }

      await ManageQueue.updateOne(
        { _id: data.jobId },
        { progress: "SUCCESS", note: `Đã sync ${synced} orders` }
      );

      console.log("✅ Hoàn thành sync Elasticsearch!");
      done();
    } catch (error) {
      console.error("❌ Lỗi sync Elasticsearch:", error);
      await ManageQueue.updateOne(
        { _id: data.jobId },
        { progress: "ERROR", note: error.toString() }
      );
      done();
    }
  });
}
