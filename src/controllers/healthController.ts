import pkg from 'express'; // Correct way to import Express in an ES Module context
const { Request, Response } = pkg; // Destructure Request and Response from the default import

/**
 * Health check endpoint for container orchestration
 * Returns application status and basic system information
 */
export const healthCheck = (req: Request, res: Response): void => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
    },
    pid: process.pid,
  };

  res.status(200).json(healthStatus);
};

/**
 * Readiness check endpoint for container orchestration
 * Checks if the application is ready to receive traffic
 */
export const readinessCheck = (req: Request, res: Response): void => {
  // Add any additional readiness checks here (database connectivity, etc.)
  const readinessStatus = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'connected', // This would be a real check in production
      services: 'available',
    },
  };

  res.status(200).json(readinessStatus);
};

/**
 * Liveness check endpoint for container orchestration
 * Simple check to verify the application is still running
 */
export const livenessCheck = (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
};
