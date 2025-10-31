import { $post, headers } from ".";

const paths = ["promotion"];

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
          res.data[0].response.message ||
            "Không tim thấy chương trình khuyến mãi!"
        );
      } catch (error) {
        console.log("findMany promotion", error);
        throw new Error(error.toString());
      }
    }
  );
};

const findManyCoupon = async (query, options) => {
  return $post(paths, [{ method: "findManyCoupon", query, options }], {
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
        res.data[0].response.message || "Không tìm thấy mã khuyến mãi!"
      );
    } catch (error) {
      console.log("findManyCoupon", error);
      throw new Error("Không tìm thấy mã khuyến mãi!");
    }
  });
};

const useCoupon = async (data) => {
  return $post(paths, [{ method: "useCoupon", data }], { headers }).then(
    (res) => {
      try {
        if (res.data.length && res.data[0].response?.status === 200) {
          return res.data[0].response.data;
        }
        throw new Error(
          res.data[0].response.message || "Lỗi khi sử dụng mã khuyến mãi!"
        );
      } catch (error) {
        console.log("useCoupon", error);
        throw new Error(error.toString());
      }
    }
  );
};

const checkCouponUsage = async (data) => {
  return $post(paths, [{ method: "checkCouponUsage", data }], { headers }).then(
    (res) => {
      try {
        if (res.data.length && res.data[0].response?.status === 200) {
          return res.data[0].response.data;
        }
        throw new Error(
          res.data[0].response.message || "Lỗi khi kiểm tra mã khuyến mãi!"
        );
      } catch (error) {
        console.log("checkCouponUsage", error);
        throw new Error(error.toString());
      }
    }
  );
};

const revertCoupon = async (data) => {
  return $post(paths, [{ method: "revertCoupon", data }], { headers }).then(
    (res) => {
      try {
        if (res.data.length && res.data[0].response?.status === 200) {
          return res.data[0].response.data;
        }
        throw new Error(
          res.data[0].response.message || "Lỗi khi revert mã khuyến mãi!"
        );
      } catch (error) {
        console.log("revertCoupon", error);
        throw new Error(error.toString());
      }
    }
  );
};

export default {
  findMany,
  findManyCoupon,
  useCoupon,
  checkCouponUsage,
  revertCoupon,
};
