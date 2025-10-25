import { Router } from 'express';
import rank from './rank'
const router = new Router()

router.use('/', rank)

export default router
