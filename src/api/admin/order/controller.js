import { response } from "../../../services/response";
import ManageQueue from "../../models/manageQueue";

export const syncOrder = async (req, res, next) => {
  new Promise(async (resolve, reject) => {
    try {
      const job = await ManageQueue.findOne({
        name: "SYNC_ELASTIC_ORDER",
        progress: { $in: ["WAITING", "PROGRESS"] },
      });
      if (job) {
        return reject(
          new Error(
            JSON.stringify({
              status: 400,
              message:
                "Đang có quá trình đồng bộ đơn hàng. Vui lòng chờ hoàn thành",
            })
          )
        );
      }

      return resolve(
        await ManageQueue.create({
          name: "SYNC_ELASTIC_ORDER",
          worker: "SYNC_ELASTIC_ORDER",
          schedule: new Date(),
          data: {},
        })
      );
    } catch (error) {
      return reject(
        new Error(JSON.stringify({ status: 500, message: error.toString() }))
      );
    }
  })
    .then((job) => ({
      data: {
        jobId: job._id,
        message: "Bắt đầu đồng bộ đơn hàng",
      },
    }))
    .then((data) => response(res, data))
    .catch(next);
};
