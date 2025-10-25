import ManageQueue from '../../api/models/manageQueue'
import { jobQueueStream } from './bull'

let jobinterval = null
let debounce = 2000
let limitPerSecond = 10

console.log('APP QUEUE')

function stopJob() {
  console.log('stopJob');
  clearInterval(jobinterval);
}

function startJob() {
  console.log('startJob');
  jobinterval = setInterval(handleJobs, debounce);
}

function refreshJob() {
  // Clear job
  stopJob();

  // start job before 1s
  setTimeout(() => {
    startJob();
  }, 2000);
}


function adjustLimitPerSecond(count) {
  if (count >= 100) {
    limitPerSecond = 200;

    if (debounce !== 500) {
      debounce = 500;
      refreshJob();
    }
  }
  else if (count >= 50) {
    limitPerSecond = 100;

    if (debounce !== 600) {
      debounce = 600;
      refreshJob();
    }

  }
  else if (count >= 20) {
    limitPerSecond = 50;

    if (debounce !== 1000) {
      debounce = 1000;
      refreshJob();
    }

  }
  else {
    limitPerSecond = 20;

    if (debounce !== 2000) {
      debounce = 2000;
      refreshJob();
    }
  }
  // console.log('limitPerSecond', limitPerSecond);
}

async function handleJobs() {
  try {
    const jobs = await ManageQueue.find({ progress: 'WAITING', schedule: { $lte: new Date() } }).sort({ priority: 1, createdAt: 1 }).limit(limitPerSecond)
    // console.log('jobs', jobs.length);
    adjustLimitPerSecond(jobs.length);

    const allQueue = [...jobQueueStream.multi, ...jobQueueStream.single];
    const allQueueObj = {};
    allQueue.forEach(q => {
      allQueueObj[q.name] = q;
    })

    jobs.forEach(async job => {
      const jobQueue = allQueueObj[job.name];
      // console.log('jobQueue.count()', await jobQueue.queue.count());
      if (jobQueue && (await jobQueue.queue.getJobCounts('wait')).wait < jobQueue.concurrency * 10) {
        await job.set({ progress: 'PROGRESS' }).save()
        jobQueue.queue.add({ ...job.data, jobId: job._id }, {
          removeOnComplete: true,
          removeOnFail: true,
          jobId: job._id
        })
        console.log('job:', jobQueue.name, await jobQueue.queue.getJobCounts('wait'));
      }
    });
  } catch (error) {
    console.log('handleJobs error', error)
  }
}


setTimeout(() => {
  startJob();
}, 10000);

