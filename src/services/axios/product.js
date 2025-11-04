import { $post, headers } from ".";

const paths = ["products"];

const findMany = async (query) => {
  return $post(paths, [{ method: "findMany", query }], { headers }).then(
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
          res.data[0].response.message || "Không tim thấy sản phẩm!"
        );
      } catch (error) {
        console.log("findMany products", error);
        throw new Error(error.toString());
      }
    }
  );
};

const findManyTopping = async (query) => {
  return $post(paths, [{ method: "findManyTopping", query }], { headers }).then(
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
          res.data[0].response.message || "Không tim thấy topping!"
        );
      } catch (error) {
        console.log("findMany topping", error);
        throw new Error(error.toString());
      }
    }
  );
};

export default {
  findMany,
  findManyTopping,
};
