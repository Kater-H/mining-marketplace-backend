import { Router } from 'express';
import { healthCheck, readinessCheck, livenessCheck } from '../controllers/healthController.js'; // Ensure .js is here

const router = Router();

// ADDED: A basic health check for the root of the /api/health path
router.get('/', healthCheck); // This will make GET /api/health work

router.get('/status', healthCheck);
router.get('/ready', readinessCheck);
router.get('/live', livenessCheck);

export const healthRoutes = router;