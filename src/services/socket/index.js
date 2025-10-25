import { redis } from "../../config";
import socketIO from "socket.io";
import redisAdapter from "socket.io-redis";

import { JOIN_ROOM, SHOW_ROOM, LEAVE_ROOM, PING } from "./handleSocket";


export default (server) => {
  const io = socketIO(server, {
    transports: ["websocket", "polling"],
    // path: '/socket/sale-center'
  });


  // io.adapter(redisAdapter({ host: redis.host, port: redis.port, auth_pass: redis.password }));
  // let adapterUri = "redis://<password>@<url>:<port>"
  let adapterURI = redis.uri.replace('root:', '');    // Loại bỏ root: nêu có

  io.adapter(redisAdapter("", adapterURI));
  // of("/socket/orders").
  io.on("connection", (client) => {
    // console.log(client.handshake.headers);
    console.log("CÓ người vừa kết nối nè", client.id);
    // console.log('client', client);
    client.on("PING", (data) => PING({ io, client, data }));
    // Mỗi shop tương đương 1 room ( 1 room nhiều staff)
    client.on("JOIN_ROOM", (data) => JOIN_ROOM({ io, client, data }));
    client.on("SHOW_ROOM", (data) => SHOW_ROOM({ io, client, data }));
    client.on("LEAVE_ROOM", (data) => LEAVE_ROOM({ io, client, data }));
    // shop
  });

  // io.set("authorization", (handshakeData, callback) => {
  //   // console.log('handshakeData');
  //   // make sure the handshake data looks good
  //   callback(null, true); // error first, "authorized" boolean second
  // });

  io.use((socket, next) => {
    console.log('socket');
    next()
  })
}
