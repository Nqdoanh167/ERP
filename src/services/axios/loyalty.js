import { $post, headers } from ".";

const paths = ["loyalty"];

const addOneOrderPointTransaction = async (data) => {
  return $post(paths, [{ method: "addOneOrderPointTransaction", data }], {
    headers,
  }).then((res) => {
    try {
      if (
        res.data.length &&
        res.data[0].response?.status === 200 &&
        res.data[0].response?.data
      ) {
        return res.data[0].response.data;
      }
      throw new Error(
        res.data[0].response.message || "Thêm điểm thưởng đơn hàng thất bại!"
      );
    } catch (error) {
      console.log("addOneOrderPointTransaction", error);
      throw new Error(error.toString());
    }
  });
};

export default {
  addOneOrderPointTransaction,
};
