import { Router } from "express";
import { middleware as body } from "bodymen";
import { flashSaleCreateModel } from "../../models/flashSale";
import { orderCreateModel } from "../../models/order";
import { confirmPaid, create, show } from "./controller";
import { buy, reservationStatus } from "./reservation-controller";

const router = new Router();

router.post("/", body(flashSaleCreateModel), create);

router.get("/:id", show);

router.post(
  "/:id/buy",
  body({
    qty: { type: Number, min: 1, max: 10, default: 1 },
    customer: orderCreateModel.customer, // phone bắt buộc, check trong controller
    shipment: orderCreateModel.shipment,
    branch: orderCreateModel.branch,
    orderType: orderCreateModel.orderType,
    note: orderCreateModel.note,
  }),
  buy
);

router.get("/:id/reservations/:reservationId", reservationStatus);

router.post("/:id/reservations/:reservationId/paid", confirmPaid);

export default router;
