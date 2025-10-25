import http from 'http'
import { env, mongo, portQueue, ip } from '../config'
import mongoose from '../services/mongoose'
import express from '../services/express'
import { jobQueueStream } from '../services/queue/bull'



const app = express('/', null, 'queue')

const server = http.createServer(app)

// set name app
// global.node_app = 'queue'

if (mongo.uri) {
  mongoose.connect(mongo.uri)
}
mongoose.Promise = Promise
mongoose.set('debug', false)
// models

/**CRONJOB */
import("../services/queue/run")

function runTask() {

  console.log(`Tasks single ${process.pid} is running`);

  jobQueueStream.single.forEach(item => {
    if (item.worker) {
      item.worker(item.queue, item.concurrency || 1);
    }
  })
}
setImmediate(() => {
  // setTimeout(() => {
  server.listen(portQueue, ip, () => {
    runTask();

    console.log('Express server queue listening on http://%s:%d, in %s mode', ip, portQueue, env)
  })
  // }, 500);
})

export default app
