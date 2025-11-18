import { Router } from "express";
import { syncOrder } from "./controller";

const router = new Router();

router.post("/sync-order", syncOrder);

export default router;
