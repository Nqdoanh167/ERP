import http from 'http'
import { env, mongo, port, ip, apiRoot } from '../config'
import mongoose from '../services/mongoose'
import express from '../services/express'
import api from '../api'

import { cpus } from 'os';
import process from 'process';
import cluster from 'cluster';
import Promise from 'bluebird'

const app = express(apiRoot, api, 'main')
const server = http.createServer(app)

if (mongo.uri) {
  mongoose.connect(mongo.uri)
}
mongoose.Promise = Promise
// kafka
import('../services/kafka')
let threadNumber = (env === 'development') ? 1 : cpus().length;

if (threadNumber > 4) threadNumber = 4
if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < threadNumber; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  console.log(`Worker ${process.pid} started`);
  setImmediate(() => {
    server.listen(port, ip, () => {
      console.log('Express server listening on http://%s:%d, in %s mode', ip, port, env)
    })
  })
}

export default app
