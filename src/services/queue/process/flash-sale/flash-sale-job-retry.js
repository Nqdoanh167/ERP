import ManageQueue from "../../../../api/models/manageQueue";

const MAX_HIT = 5;

export const markJobSuccess = (jobId, note) =>
  ManageQueue.updateOne({ _id: jobId }, { progress: "SUCCESS", note });

/**
 * ManageQueue không tự retry job ERROR → tự đặt lại WAITING với backoff 1s, 2s, 4s...
 * Hết lượt thì gọi `onGiveUp` (vd trả suất) rồi đánh ERROR.
 */
export const retryOrGiveUp = async ({ data, error, onGiveUp }) => {
  const job = await ManageQueue.findById(data.jobId);
  if (job && job.hit < MAX_HIT) {
    return job
      .set({
        progress: "WAITING",
        hit: job.hit + 1,
        schedule: new Date(Date.now() + 2 ** job.hit * 1000),
        note: error.toString(),
      })
      .save();
  }

  if (onGiveUp) await onGiveUp();
  await ManageQueue.updateOne(
    { _id: data.jobId },
    { progress: "ERROR", note: error.toString() }
  );
};
