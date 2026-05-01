import { Router } from 'express';
import { paymentController } from '../controllers/paymentController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/clients/:clientId/payments', paymentController.findByClient);
router.get('/payments/available', paymentController.getAvailablePayments);

export default router;
