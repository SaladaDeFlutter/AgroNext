import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.post('/send-verification', authController.sendVerificationCode);
router.post('/resend-verification', authController.resendVerificationCode);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', auth, authController.getProfile);
router.patch('/team', auth, authController.updateTeam);
router.post('/team/join', auth, authController.joinTeam);
router.get('/team/invite', auth, authController.getTeamInvite);

export default router;
