import ManageQueue from "../../../api/models/manageQueue";
// import Queue from 'bull'
// import { opts } from '../../redis/queue'

// // console.log('opts', opts)

// const worker = new Queue('REFRESH_JOB_PROGRESS', opts);
// // Chạy đồng thời tối đa 1 process tren 1 worker
// const Concurrency = 1;
// /**
//  * Job xử lý đồng bộ dữ liệu đơn hàng sang các partner
//  *  @param { data }: {
//  *    bizId
//  *  }
//  */
export default function process(worker, concurrency) {
  worker.process(concurrency, async (job, done) => {
    const { data } = job;
    try {

      const manageQueue = await ManageQueue.findById(data.jobId);
      if (!manageQueue) {
        return done();
      }


      // Cập nhật lại toàn bộ job sau 10p đang ở progress
      await ManageQueue.updateMany({ progress: 'PROGRESS', createdAt: { $lte: new Date(Date.now() - 10 * 1000 * 60) } }, { progress: 'WAITING' });

      let schedule = new Date(Date.now() + 10 * 1000 * 60); // 10p sau
      await manageQueue.set({
        progress: 'WAITING',
        schedule
      }).save();
      return done();
    } catch (error) {
      console.log("---------ERROR REFRESH_JOB_PROGRESS", error);
      await ManageQueue.updateOne({ _id: data.jobId }, { progress: 'ERROR', note: error.toString() })
      done();
    }
  })
  // worker.on("completed", async function (job, result) {
  //   console.log(
  //     "-----------Job REFRESH_JOB_PROGRESS completed with output result!-------------"
  //   );
  // });
}








// worker.on("error", function (err) {
//   // Job error with output result!
//   console.log("-----------Job REFRESH_JOB_PROGRESS error with output ");
//   console.log("err", err);
// });
// export default worker
