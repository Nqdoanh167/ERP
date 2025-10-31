import { Router } from "express";
// import apiAdmin from './admin'
import apiBackdoor from "./backdoor";
import { token, backdoor } from "../services/passport";
import { service } from "../config";
import apiBiz from "./biz";

const router = new Router();

// router.use('/admin', token({ required: true, roles: ['ADMIN'] }), apiAdmin)

router.use(`/${service}`, backdoor({ required: true }), apiBackdoor);
router.use(`/bizs/:bizAlias/${service}`, token({ required: true }), apiBiz);

export default router;
