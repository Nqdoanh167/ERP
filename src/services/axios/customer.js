import { $post, headers } from ".";

const paths = ["customers"];

const findOne = async (query) => {
  return $post(paths, [{ method: "findOne", query }], { headers }).then(
    (res) => {
      try {
        if (
          res.data.length &&
          res.data[0].response?.status === 200 &&
          res.data[0].response?.data
        ) {
          return res.data[0].response.data;
        }
        throw new Error(
          res.data[0].response.message || "Không tim thấy khách hàng!"
        );
      } catch (error) {
        console.log("findOne", error);
        throw new Error("Không tim thấy khách hàng!");
      }
    }
  );
};
const updateOne = async (query, data) => {
  return $post(paths, [{ method: "updateOne", query, data }], { headers }).then(
    (res) => {
      try {
        if (
          res.data.length &&
          res.data[0].response?.status === 200 &&
          res.data[0].response?.data
        ) {
          return res.data[0].response.data;
        }
        throw new Error(
          res.data[0].response.message || "Không tim thấy khách hàng!"
        );
      } catch (error) {
        console.log("updateOne", error);
        throw new Error(error.toString());
      }
    }
  );
};

const findOne_addOne = async (query, data) => {
  return $post(
    paths,
    [{ method: "findOne_addOne", query, data, update_if_found: true }],
    { headers }
  ).then((res) => {
    try {
      if (
        res.data.length &&
        res.data[0].response?.status === 200 &&
        res.data[0].response?.data
      ) {
        return res.data[0].response.data;
      }
      throw new Error(
        res.data[0].response.message || "Tạo khách hàng thất bại!"
      );
    } catch (error) {
      console.log("findOne", error);
      throw new Error(error.toString());
    }
  });
};
const addOne = async (data) => {
  return $post(paths, [{ method: "addOne", data }], { headers }).then((res) => {
    try {
      if (
        res.data.length &&
        res.data[0].response?.status === 200 &&
        res.data[0].response?.data
      ) {
        return res.data[0].response.data;
      }
      throw new Error(
        res.data[0].response.message || "Tạo khách hàng thất bại!"
      );
    } catch (error) {
      console.log("findOne", error);
      throw new Error(error.toString());
    }
  });
};

export default {
  findOne,
  findOne_addOne,
  addOne,
  updateOne,
};
