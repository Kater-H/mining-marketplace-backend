import express from 'express';
import { HealthController } from '../controllers/healthController';
import { protect, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../interfaces/user';

const router = express.Router();
const healthController = new HealthController();

// Public health check endpoint
router.get('/health', healthController.healthCheck.bind(healthController));

// Detailed health check endpoint (requires admin authentication)
router.get(
  '/health/detailed',
  protect,
  authorize('admin' as UserRole),
  healthController.detailedHealthCheck.bind(healthController)
);

export default router;


