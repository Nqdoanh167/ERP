import { Router } from "express";
// import apiAdmin from './admin'
import apiBackdoor from "./backdoor";
import { token, backdoor, bizToken, admin } from "../services/passport";
import { service } from "../config";
import apiBiz from "./biz";
import apiPartner from "./partner";
import apiAdmin from "./admin";

const router = new Router();

// router.use('/admin', token({ required: true, roles: ['ADMIN'] }), apiAdmin)

router.use(`/${service}`, backdoor({ required: true }), apiBackdoor);
router.use(`/bizs/:bizAlias/${service}`, token({ required: true }), apiBiz);
router.use(
  `/public/bizs/:bizAlias/${service}`,
  bizToken({ required: true }),
  apiPartner
);

router.use(`/admin/${service}`,admin({ required: true }), apiAdmin);

export default router;
