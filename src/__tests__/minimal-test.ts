// Fix 1: Add types for Jest (or your chosen test runner like Mocha)
import { healthCheck } from '../controllers/healthController.js'; // ADDED .js
import { Request, Response } from 'express'; // External module, no .js

// Fix 2: Mock Request and Response objects for testing
const mockRequest = {} as Request;
const mockResponse = {
  status: jest.fn().mockReturnThis(), // Mock status method to allow chaining .json()
  json: jest.fn(), // Mock json method
} as unknown as Response; // Cast through unknown to bypass strict type checking

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
