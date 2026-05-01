import { Router } from 'express';
import { clientController } from '../controllers/clientController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.get('/clients', clientController.findAll);
router.get('/clients/available', clientController.getAvailableClients);
router.get('/clients/:id', clientController.findById);
router.get('/routes/:routeId/clients', clientController.findByRoute);

export default router;
