import { Router } from "express";
import order from "./order";

const router = new Router();

router.use("/", order);

export default router;
