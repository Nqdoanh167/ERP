import { Router } from "express";
import { middleware as body } from "bodymen";
import { middleware as query } from "querymen";
import { orderCreateModel, orderUpdateModel } from "../../models/order";
import {
  create,
  destroy,
  index,
  show,
  update,
  updateStatus,
} from "./controller";
import { serviceCache } from "../../../services/cache";

const router = new Router();

router.post("/", body(orderCreateModel), create);
router.post(
  "/update-status",
  body({ status: String, orderId: String }),
  updateStatus
);

router.put("/:id", body(orderUpdateModel), update);

router.get(
  "/",
  query({
    page: { type: Number, default: 1, max: 500 },
    limit: { type: Number, default: 20, max: 999999 },
    q: { type: String },
    status: { type: String },
    branch: {
      type: String,
      paths: ["branch.id"],
    },
    createdAt_gte: { type: Date, paths: ["createdAt"], operator: "gte" },
    createdAt_lte: { type: Date, paths: ["createdAt"], operator: "lte" },
  }),
  serviceCache({ model: "order" }),
  index
);

router.get("/:id", show);

router.delete("/:id", destroy);

export default router;
