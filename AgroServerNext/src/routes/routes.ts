import { Router, Request, Response } from 'express';
import { routeController } from '../controllers/routeController.js';
import { userController } from '../controllers/userController.js';
import { asaasController, getRefreshProgress } from '../controllers/asaasController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.post('/routes', routeController.create);
router.get('/routes', routeController.findAll);
router.get('/routes/:id', routeController.findById);
router.delete('/routes/:id', routeController.delete);
router.delete('/routes/:routeId/payments/:paymentId', asaasController.removePaymentFromRoute);
router.get('/routes/:id/asaas-data', asaasController.getRouteAsaasData);
router.get('/routes/:id/refresh-progress', (req: Request, res: Response) => {
  const progress = getRefreshProgress(req.params.id);
  res.json({ status: 'success', data: progress || { total: 0, current: 0 } });
});
router.post('/routes/add-payment', asaasController.addPaymentToRoute);
router.post('/routes/add-installment', asaasController.addInstallmentToRoute);

router.get('/users/sellers', userController.findAllSellers);

export default router;