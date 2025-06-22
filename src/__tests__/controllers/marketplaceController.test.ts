import { Request, Response } from 'express';
import { createMineralListing, marketplaceService } from '../../controllers/marketplaceController'; // Import the exported instance

// No need to mock the entire MarketplaceService module if we are mocking the instance directly
// jest.mock('../../services/marketplaceService'); 

describe('createMineralListing', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockReq = {};
    mockRes = {
      status: mockStatus,
      json: mockJson
    };

    // Mock the method directly on the exported instance
    jest.spyOn(marketplaceService, 'createMineralListing').mockClear();
  });

  it('should create a mineral listing and return 201 status', async () => {
    const mockListingData = {
      commodity_type: 'Gold',
      volume: 100,
      volume_unit: 'kg',
      grade: '24K',
      origin_country: 'Canada',
      origin_region: 'Ontario',
      origin_coordinates: '43.6532, -79.3832',
      price: 500000,
      price_currency: 'USD',
      price_per_unit: 5000,
      description: 'High-quality gold from Canadian mines',
      environmental_score: 8,
      social_score: 7,
      governance_score: 9,
      notes: 'Ethically sourced'
    };

    const mockUserId = 'user123';
    (mockReq as any).user = { id: mockUserId };
    mockReq.body = mockListingData;

    (marketplaceService.createMineralListing as jest.Mock).mockResolvedValue({
      listing_id: 'listing123'
    });

    await createMineralListing(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(201);
    expect(mockJson).toHaveBeenCalledWith({
      id: 'listing123',
      mineralType: 'Gold',
      quantity: '100.00',
      pricePerUnit: '5000.00'
    });
    expect(marketplaceService.createMineralListing).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUserId,
        commodity_type: 'Gold',
        volume: 100,
        volume_unit: 'kg',
        origin_location: 'Canada',
        origin_country: 'Canada',
        origin_region: 'Ontario',
        price: 500000,
        price_currency: 'USD',
        price_per_unit: 5000,
        description: 'High-quality gold from Canadian mines',
        available: true,
        currency: 'USD'
      }),
      expect.objectContaining({
        environmental_score: 8,
        social_score: 7,
        governance_score: 9,
        notes: 'Ethically sourced'
      })
    );
  });

  it('should return 400 if required fields are missing', async () => {
    mockReq.body = {
      commodity_type: 'Gold',
      volume: 100,
      volume_unit: 'kg',
      // Missing origin_country and origin_region
    };

    await createMineralListing(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({ error: 'Missing required fields' });
  });

  it('should return 500 if an error occurs', async () => {
    mockReq.body = {
      commodity_type: 'Gold',
      volume: 100,
      volume_unit: 'kg',
      origin_country: 'Canada',
      origin_region: 'Ontario',
    };
    (mockReq as any).user = { id: 'user123' };

    (marketplaceService.createMineralListing as jest.Mock).mockRejectedValue(new Error('Database error'));

    await createMineralListing(mockReq as Request, mockRes as Response);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({ message: 'Server error during listing creation' });
  });
});

