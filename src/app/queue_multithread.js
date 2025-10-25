import http from 'http'
import { env, mongo, portQueueMultithread, ip } from '../config'
import mongoose from '../services/mongoose'
import express from '../services/express'
import { jobQueueStream } from '../services/queue/bull'
import cluster from 'cluster'
import { Promise } from 'bluebird';

const app = express('/', null, 'queue')

const server = http.createServer(app)

if (mongo.uri) {
  mongoose.connect(mongo.uri)
}
mongoose.Promise = Promise
mongoose.set('debug', false)

function runTask() {

  console.log(`Tasks multithread ${process.pid} is running`);

  jobQueueStream.multi.forEach(item => {
    if (item.worker) {
      item.worker(item.queue, item.concurrency || 1);
    }
  })
}

setImmediate(() => {
  let threadNumber = 2;
  if (cluster.isPrimary && env === 'production') {
    // Fork workers.
    for (let i = 0; i < threadNumber; i++) {
      setTimeout(() => {
        // run tasks
        cluster.fork();
      }, i + 200);
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
      cluster.fork();
    });
  } else {
    server.listen(portQueueMultithread, ip, () => {
      runTask();
      console.log('Express server listening on http://%s:%d, in %s mode', ip, portQueueMultithread, env)
    })
    console.log(`Worker ${process.pid} started`);
  }
})

export default app
