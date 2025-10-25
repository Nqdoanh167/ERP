import ManageQueue from "../../../../api/models/manageQueue";

export default function process(worker, concurrency = 1) {

  worker.process(concurrency, async (job, done) => {
    const { data } = job;
    try {
      const responseJob = {
        isSuccess: true,
        message: ''
      }

      // Xóa toàn bộ job từ 1 ngày trước
      await ManageQueue.deleteMany({ progress: { $in: ['SUCCESS', 'ERROR'] }, createdAt: { $lte: new Date(Date.now() - 86400000) } })
      await ManageQueue.deleteMany({ progress: { $in: ['PROGRESS'] }, schedule: { $lte: new Date(Date.now() - 14 * 86400000) } })

      let schedule = new Date(Date.now() + 7 * 86400000);
      schedule.setHours(0);
      schedule.setMinutes(0);

      await ManageQueue.create({
        name: "CLEAR_JOB",
        worker: "CLEAR_JOB",
        schedule: schedule, // 7 ngày sau sẽ xóa
        data: {}
      });

      if (responseJob.isSuccess)
        await ManageQueue.updateOne({ _id: data.jobId }, { progress: 'SUCCESS', note: 'Thành công!' })
      else
        await ManageQueue.updateOne({ _id: data.jobId }, { progress: 'ERROR', note: responseJob.message })
      done();
    } catch (error) {
      console.log("---------ERROR CLEAR_JOB", error);
      await ManageQueue.updateOne({ _id: data.jobId }, { progress: 'ERROR', note: error.toString() })
      done();
    }
  })


  // worker.on("completed", async function (job, result) {
  //   console.log("-----------Job REFRESH_TOKEN completed with output result!-------------");
  // });
  // worker.on("error", function (err) {
  //   console.log("-----------Job REFRESH_TOKEN error with output ");
  // });
}