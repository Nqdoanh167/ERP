import { Router } from "express";
// import apiAdmin from './admin'
import apiBackdoor from "./backdoor";
import { token, backdoor, bizToken } from "../services/passport";
import { service } from "../config";
import apiBiz from "./biz";
import apiPartner from "./partner";

const router = new Router();

// router.use('/admin', token({ required: true, roles: ['ADMIN'] }), apiAdmin)

router.use(`/${service}`, backdoor({ required: true }), apiBackdoor);
router.use(`/bizs/:bizAlias/${service}`, token({ required: true }), apiBiz);
router.use(
  `/public/bizs/:bizAlias/${service}`,
  bizToken({ required: true }),
  apiPartner
);

export default router;
