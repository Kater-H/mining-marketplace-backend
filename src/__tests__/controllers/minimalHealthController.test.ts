import { Request, Response } from 'express';
import { HealthController } from '../../controllers/healthController';

describe('HealthController - Minimal Test', () => {
  let healthController: HealthController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    healthController = new HealthController();
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {};
    mockRes = {
      status: mockStatus,
      json: mockJson
    };
  });

  it('should return 200 status for a basic health check', async () => {
    jest.spyOn(healthController as any, 'checkDatabaseConnection').mockResolvedValue({ status: 'connected' });
    jest.spyOn(healthController as any, 'checkExternalServices').mockResolvedValue({ status: 'connected' });
    jest.spyOn(healthController as any, 'checkSystemResources').mockReturnValue({ status: 'connected' });

    await healthController.healthCheck(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(200);
    expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ok',
    }));
  });
});


