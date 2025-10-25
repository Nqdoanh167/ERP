// import { verifyUser } from "../passport";
// import { validShopSocket } from "../shop";
// import BizPhone from "../../api/models/bizPhone";
// import Staff from "../../api/shop/staff/model";
// import { Types } from "mongoose";
// import { verifyUser } from '../passport';
// import app from './app'
/**
 * Client sẽ gửi token user lên
 * - Check và tự động lấy ra danh sách idAgency của user đó và join vào room theo từng agency
 */
export const PING = async ({ io, client, data }) => {
  try {
    console.log('PING', data);
    // if (!data.token) {
    //   return;
    // }
    // const { isSuccess, user } = await verifyUser(data.token);
    // // console.log('PINT', user?.id, user?.name, data.shop);
    // if (isSuccess) {
    //   const tasks = [
    //     User.updateOne({ _id: user.id }, { lastOnline: new Date() })
    //   ]
    //   if (Types.ObjectId.isValid(data.shop)) {
    //     tasks.push(Staff.updateOne({ user: user.id, shop: data.shop }, { lastOnline: new Date() }))
    //   }
    //   await Promise.all(tasks);
    // }
  } catch (error) { }
}
/**
 * Client sẽ gửi token user lên
 * - Check và tự động lấy ra danh sách idAgency của user đó và join vào room theo từng agency
 */
export const JOIN_ROOM = async ({ io, client, data }) => {
  try {
    if (data.token) {
      // const { isSuccess, user } = await verifyUser(data.token);
      // console.log('socket:', { isSuccess, user });
      // if (isSuccess) {
      //   // const bizPhone = await BizPhone.findOne({ userId: user.id, _id: data.bizPhone }).select('_id phone_number').lean()
      //   // if (bizPhone) {
      //   // }
      //   client.join(user.id);
      //   client.emit("JOIN_ROOM_SUCCESS", { userId: user.id });
      // } else {
      //   client.emit("JOIN_ROOM_FAIL", data);
      // }

    } else {
      client.emit("JOIN_ROOM_FAIL", data);
    }
  } catch (error) {
    console.log('error', error);
  }
};
export const SHOW_ROOM = ({ io, client, data }) => {
  // console.log('SHOW_ROOM', io.sockets.adapter.rooms);
};
export const LEAVE_ROOM = ({ io, client, data }) => {
  console.log('LEAVE_ROOM', data);
  if (data.bizPhone) {
    // console.log('data.channelLive', data.channelLive);
    client.leave(data.bizPhone)
  } else {
  }
  // console.log('LEAVE_ROOM', io.sockets.adapter.rooms);
};
