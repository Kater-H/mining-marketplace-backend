// Fix 1: Add types for Jest (or your chosen test runner like Mocha)
import { healthCheck } from '../controllers/healthController'; // Removed .ts
import { Request, Response } from 'express'; // Import Request/Response types for mocking

// Fix 2: Mock Request and Response objects for testing
const mockRequest = {} as Request;
const mockResponse = {
  status: jest.fn().mockReturnThis(), // Mock status method to allow chaining .json()
  json: jest.fn(), // Mock json method
} as Response;

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
