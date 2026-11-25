import { Router } from 'express';
import order from './order';
import flashSale from './flash-sale';
const router = new Router()

// Phải mount trước order, nếu không `GET /:id` của order nuốt route
router.use('/flash-sales', flashSale)
router.use('/', order)

export default router
