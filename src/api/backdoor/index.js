import { Router } from "express";
import { success } from "../../services/response";
import { findOne, findMany, updateOne, addOne } from "./order/controller";
const router = new Router();

// Các method hỗ trợ
const methodName = ["findOne", "findMany", "updateOne", "addOne"];
const method = {
  findOne,
  findMany,
  updateOne,
  addOne,
};
router.post("/", (req, res, next) => {
  new Promise(async (resolve, reject) => {
    if (!Array.isArray(req.body)) {
      return reject(
        new Error(
          JSON.stringify({
            status: 403,
            statusText: "BAD_USER_INPUT",
            message: "Bad User Input",
          })
        )
      );
    }

    return resolve(
      Promise.all(
        req.body.map(async (body, index) => {
          if (!methodName.includes(body.method)) {
            return {
              ...body,
              response: {
                status: 403,
                statusText: "BAD_USER_INPUT",
                message: "Method is not support",
              },
            };
          }
          body.backdoor = req.backdoor;
          const resp = await method[body.method](body);
          resp.methodId = body.methodId || index + 1;
          resp.method = body.method;
          return resp;
        })
      )
    );
  })
    .then(success(res, 200))
    .catch(next);
});

export default router;
