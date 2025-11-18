import Queue from 'bull';
import config from '../../config'
import redisUrl from 'redis-url';

// export const createClient = new Redis(redis.port, redis.host);
const redisConfig = {}

if (config.redis.uri) {
  const parseURI = redisUrl.parse(config.redis.uri);
  // console.log('parseURI', parseURI);

  redisConfig.host = parseURI.hostname
  redisConfig.port = Number(parseURI.port)

  if (parseURI.password) {
    redisConfig.password = parseURI.password
  }
} else {
  if (config.redis.port) {
    redisConfig.port = config.redis.port
  }
  if (config.redis.host) {
    redisConfig.host = config.redis.host
  }
  if (config.redis.password) {
    redisConfig.password = config.redis.password
  }

}

export const opts = {
  redis: redisConfig,
  prefix: config.redis.prefix
}

// process single
import process_CLEAR_JOB_QUEUE from "../queue/process/clearjob";
import process_SYNC_ELASTIC_ORDER from "../queue/process/order/sync-order";

// process multithread

export const configQueue = {
  // single
  CLEAR_JOB_QUEUE: {
    queue: new Queue("CLEAR_JOB_QUEUE", opts),
    concurrency: 1,
    worker: process_CLEAR_JOB_QUEUE,
  },
  SYNC_ELASTIC_ORDER: {
    queue: new Queue("SYNC_ELASTIC_ORDER", opts),
    concurrency: 1,
    worker: process_SYNC_ELASTIC_ORDER,
  },
  // multi
};
/**
 * @return { <name>: string }
 */
// export const configQueueName = Object.keys(configQueue).reduce((obj, key) => {
//   obj[key] = key;
//   return obj
// }, {})
export const configQueueName = {
  CLEAR_JOB_QUEUE: "CLEAR_JOB_QUEUE",
  LISTEN_SIGNAL_QUEUE: "LISTEN_SIGNAL_QUEUE",
  SYNC_ELASTIC_ORDER_QUEUE: "SYNC_ELASTIC_ORDER_QUEUE",
};

export const addJob = async (name, data = {}, options = {}) => {
  if (configQueue[name]) {
    configQueue[name].queue.add(data, Object.assign({
      removeOnComplete: true,
      removeOnFail: true
    }, options));
  }
}

const jobStream = {
  single: [],
  multi: []
}

for (const [key, job] of Object.entries(configQueue)) {
  console.log('job', job.concurrency);
  if (job.concurrency > 1) {
    jobStream.multi.push({ name: key, queue: job.queue, worker: job.worker, concurrency: job.concurrency })
  } else {
    jobStream.single.push({ name: key, queue: job.queue, worker: job.worker, concurrency: job.concurrency })
  }
}
export const jobQueueStream = jobStream;
