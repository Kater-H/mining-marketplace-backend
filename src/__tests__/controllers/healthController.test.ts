import { Request, Response } from 'express';
import { HealthController, healthCheck, detailedHealthCheck } from '../../controllers/healthController';
import { logger } from '../../config/monitoring/logger';
import { NotificationService } from '../../config/monitoring/notification';

// Mock dependencies
jest.mock('../../config/monitoring/logger', () => ({
  logger: {
    error: jest.fn()
  }
}));

// Mock the entire NotificationService module
jest.mock('../../config/monitoring/notification', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    sendErrorNotification: jest.fn(),
  })),
}));

describe('HealthController', () => {
  let healthController: HealthController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockSendErrorNotification: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock request and response objects
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {};
    mockRes = {
      status: mockStatus,
      json: mockJson
    };

    // Create a new instance of HealthController for each test
    healthController = new HealthController();

    // Get the mocked sendErrorNotification from the mocked NotificationService instance
    mockSendErrorNotification = (NotificationService as jest.Mock).mock.results[0].value.sendErrorNotification;

    // Mock the private methods of HealthController on the *real* instance
    jest.spyOn(healthController as any, 'checkDatabaseConnection').mockResolvedValue({
      status: 'connected',
      responseTime: 15,
      connections: 5
    });

    jest.spyOn(healthController as any, 'checkExternalServices').mockResolvedValue({
      payment: {
        stripe: { status: 'connected', responseTime: 230 },
        flutterwave: { status: 'connected', responseTime: 245 }
      },
      storage: {
        status: 'connected',
        responseTime: 45
      }
    });

    jest.spyOn(healthController as any, 'checkSystemResources').mockReturnValue({
      memory: {
        total: 100,
        used: 50,
        rss: 75
      },
      cpu: {
        usage: 25.5
      }
    });
  });

  describe('healthCheck', () => {
    it('should return 200 status with health information when successful', async () => {
      // Mock Date.toISOString to return a consistent value for testing
      const mockDate = '2025-06-13T04:26:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

      // Set environment variables for testing
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        APP_VERSION: '1.2.3',
        NODE_ENV: 'test'
      };

      // Call the method
      await healthController.healthCheck(mockReq as Request, mockRes as Response);

      // Verify response
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'ok',
        timestamp: mockDate,
        version: '1.2.3',
        environment: 'test',
        database: {
          status: 'connected',
          responseTime: 15,
          connections: 5
        },
        services: {
          payment: {
            stripe: { status: 'connected', responseTime: 230 },
            flutterwave: { status: 'connected', responseTime: 245 }
          },
          storage: {
            status: 'connected',
            responseTime: 45
          }
        }
      });

      // Restore environment and mocks
      process.env = originalEnv;
      jest.restoreAllMocks();
    });

    it('should return 500 status with error message when an error occurs', async () => {
      // Mock Date.toISOString to return a consistent value for testing
      const mockDate = '2025-06-13T04:26:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

      // Mock checkDatabaseConnection to throw an error
      jest.spyOn(healthController as any, 'checkDatabaseConnection').mockRejectedValue(new Error('Database connection failed'));

      // Call the method
      await healthController.healthCheck(mockReq as Request, mockRes as Response);

      // Verify response
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Health check failed',
        timestamp: mockDate
      });

      // Verify logger was called
      expect(logger.error).toHaveBeenCalledWith('Health check failed', { error: expect.any(Error) });

      // Verify notification was sent
      expect(mockSendErrorNotification).toHaveBeenCalledWith(
        'Health Check Failed',
        'The application health check has failed',
        'Database connection failed'
      );

      // Restore mocks
      jest.restoreAllMocks();
    });

    it('should handle non-Error objects in catch block', async () => {
      // Mock Date.toISOString to return a consistent value for testing
      const mockDate = '2025-06-13T04:26:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

      // Mock checkDatabaseConnection to throw a non-Error object
      jest.spyOn(healthController as any, 'checkDatabaseConnection').mockRejectedValue('Database connection failed string');

      // Call the method
      await healthController.healthCheck(mockReq as Request, mockRes as Response);

      // Verify response
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Health check failed',
        timestamp: mockDate
      });

      // Verify logger was called
      expect(logger.error).toHaveBeenCalledWith('Health check failed', { error: 'Database connection failed string' });

      // Verify notification was sent
      expect(mockSendErrorNotification).toHaveBeenCalledWith(
        'Health Check Failed',
        'The application health check has failed',
        'Database connection failed string'
      );

      // Restore mocks
      jest.restoreAllMocks();
    });
  });

  describe('detailedHealthCheck', () => {
    it('should return 200 status with detailed health information when successful', async () => {
      // Mock Date.toISOString to return a consistent value for testing
      const mockDate = '2025-06-13T04:26:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

      // Mock process.uptime
      jest.spyOn(process, 'uptime').mockReturnValue(3600); // 1 hour

      // Set environment variables for testing
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        APP_VERSION: '1.2.3',
        NODE_ENV: 'test'
      };

      // Call the method
      await healthController.detailedHealthCheck(mockReq as Request, mockRes as Response);

      // Verify response
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'ok',
        timestamp: mockDate,
        version: '1.2.3',
        environment: 'test',
        uptime: 3600,
        database: {
          status: 'connected',
          responseTime: 15,
          connections: 5
        },
        services: {
          payment: {
            stripe: { status: 'connected', responseTime: 230 },
            flutterwave: { status: 'connected', responseTime: 245 }
          },
          storage: {
            status: 'connected',
            responseTime: 45
          }
        },
        system: {
          memory: {
            total: 100,
            used: 50,
            rss: 75
          },
          cpu: {
            usage: 25.5
          }
        }
      });

      // Restore environment and mocks
      process.env = originalEnv;
      jest.restoreAllMocks();
    });

    it('should return 500 status with error message when an error occurs', async () => {
      // Mock Date.toISOString to return a consistent value for testing
      const mockDate = '2025-06-13T04:26:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

      // Mock checkDatabaseConnection to throw an error
      jest.spyOn(healthController as any, 'checkDatabaseConnection').mockRejectedValue(new Error('Database connection failed'));

      // Call the method
      await healthController.detailedHealthCheck(mockReq as Request, mockRes as Response);

      // Verify response
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Detailed health check failed',
        timestamp: mockDate,
        error: 'Database connection failed'
      });

      // Verify logger was called
      expect(logger.error).toHaveBeenCalledWith('Detailed health check failed', { error: expect.any(Error) });

      // Restore mocks
      jest.restoreAllMocks();
    });

    it('should handle non-Error objects in catch block', async () => {
      // Mock Date.toISOString to return a consistent value for testing
      const mockDate = '2025-06-13T04:26:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

      // Mock checkDatabaseConnection to throw a non-Error object
      jest.spyOn(healthController as any, 'checkDatabaseConnection').mockRejectedValue('Database connection failed string');

      // Call the method
      await healthController.detailedHealthCheck(mockReq as Request, mockRes as Response);

      // Verify response
      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        message: 'Detailed health check failed',
        timestamp: mockDate,
        error: 'Database connection failed string'
      });

      // Verify logger was called
      expect(logger.error).toHaveBeenCalledWith('Detailed health check failed', { error: 'Database connection failed string' });

      // Restore mocks
      jest.restoreAllMocks();
    });
  });

  describe('exported functions', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockJson = jest.fn().mockReturnThis();
      mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      mockReq = {};
      mockRes = {
        status: mockStatus,
        json: mockJson
      };

      // Mock the internal methods that the exported healthCheck/detailedHealthCheck functions call
      // Since these functions internally create a new HealthController, we mock the prototype
      jest.spyOn(HealthController.prototype as any, 'checkDatabaseConnection').mockResolvedValue({
        status: 'connected',
        responseTime: 15,
        connections: 5
      });
      jest.spyOn(HealthController.prototype as any, 'checkExternalServices').mockResolvedValue({
        payment: {
          stripe: { status: 'connected', responseTime: 230 },
          flutterwave: { status: 'connected', responseTime: 245 }
        },
        storage: {
          status: 'connected',
          responseTime: 45
        }
      });
      jest.spyOn(HealthController.prototype as any, 'checkSystemResources').mockReturnValue({
        memory: {
          total: 100,
          used: 50,
          rss: 75
        },
        cpu: {
          usage: 25.5
        }
      });
    });

    it('should export healthCheck function that calls the controller method', async () => {
      const mockDate = '2025-06-13T04:26:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        APP_VERSION: '1.2.3',
        NODE_ENV: 'test'
      };

      await healthCheck(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ok',
        timestamp: mockDate,
        version: '1.2.3',
        environment: 'test',
      }));
      process.env = originalEnv;
      jest.restoreAllMocks();
    });

    it('should export detailedHealthCheck function that calls the controller method', async () => {
      const mockDate = '2025-06-13T04:26:00.000Z';
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);
      jest.spyOn(process, 'uptime').mockReturnValue(3600);
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        APP_VERSION: '1.2.3',
        NODE_ENV: 'test'
      };

      await detailedHealthCheck(mockReq as Request, mockRes as Response);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ok',
        timestamp: mockDate,
        version: '1.2.3',
        environment: 'test',
        uptime: 3600,
      }));
      process.env = originalEnv;
      jest.restoreAllMocks();
    });
  });
});


