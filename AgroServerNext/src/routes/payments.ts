import { Router } from 'express';
import { paymentController } from '../controllers/paymentController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/clients/:clientId/payments', paymentController.findByClient);
router.get('/payments/available', paymentController.getAvailablePayments);
router.post('/routes/add-payment', paymentController.addToRoute);
router.post('/routes/add-installment', paymentController.addInstallmentToRoute);
router.delete('/routes/:routeId/payments/:paymentId', paymentController.removeFromRoute);

export default router;
