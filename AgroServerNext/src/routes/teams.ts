import { Router } from 'express';
import { teamController } from '../controllers/teamController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.use(auth);

router.post('/teams', teamController.create);
router.post('/teams/join', teamController.join);
router.get('/teams/my', teamController.myTeam);
router.post('/teams/refresh-invite', teamController.refreshInvite);
router.delete('/teams/members/:userId', teamController.removeMember);

export default router;
