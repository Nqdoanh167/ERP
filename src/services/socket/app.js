import { redis } from '../../config'
import SocketEmiter from 'socket.io-emitter'

console.log('redis', redis);
// const socketEmiter = SocketEmiter({ host: redis.host, port: Number(redis.port) })
const socketEmiter = SocketEmiter(redis.uri)
socketEmiter.redis.on("error", (err) => {
  console.log('ERROR SOCKET EMITTER', err);
})
export default socketEmiter
