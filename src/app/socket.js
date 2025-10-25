import http from 'http'
import { env, mongo, portSocket, ip } from '../config'
import mongoose from '../services/mongoose'
import express from '../services/express'
import socket from '../services/socket'

const app = express('/', null, 'socket')

const server = http.createServer(app)

if (mongo.uri) {
    mongoose.connect(mongo.uri)
}
mongoose.Promise = Promise
// socket
socket(server)

setImmediate(() => {
    server.listen(portSocket, ip, () => {
        console.log('Express server queue listening on http://%s:%d, in %s mode', ip, portSocket, env)
    })
})

export default app
