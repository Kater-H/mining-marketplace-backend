import { healthCheck } from '../controllers/healthController';
import { Request, Response } from 'express'; // Import Request/Response types

// Fix: Mock Request and Response objects for testing with broader type casting
const mockRequest = {} as Request;
const mockResponse = {
  status: jest.fn().mockReturnThis(), // Mock status method to allow chaining .json()
  json: jest.fn(), // Mock json method
} as unknown as Response; // CHANGED: Cast through unknown to bypass strict type checking

describe('Health Controller', () => {
  it('should return a healthy status', () => {
    // Call the healthCheck function with mock objects
    healthCheck(mockRequest, mockResponse);

    // Assertions
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'healthy',
        message: 'API is healthy', // Assuming your healthCheck has this message
      })
    );
  });
});
