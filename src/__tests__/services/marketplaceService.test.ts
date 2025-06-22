// Mock external dependencies before importing marketplaceService
jest.mock('../../config/database', () => ({
  getPool: jest.fn(),
}));

import { MarketplaceService } from '../../services/marketplaceService';
import { getPool } from '../../config/database';
import {
  MineralListingData,
  ComplianceData,
  MineralListingFilter,
  MineralOffer
} from '../../models/interfaces/marketplace';

// Get the mocked functions
const mockGetPool = getPool as jest.MockedFunction<typeof getPool>;

// Mock pool and client objects
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue(mockClient),
};

describe('MarketplaceService', () => {
  let marketplaceService: MarketplaceService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPool.mockReturnValue(mockPool as any);
    marketplaceService = new MarketplaceService();
  });

  describe('constructor', () => {
    test('should use provided pool when marketplaceModel is passed', () => {
      const customPool = { query: jest.fn() };
      const service = new MarketplaceService({ pool: customPool });
      expect(service).toBeInstanceOf(MarketplaceService);
    });

    test('should use getPool when no marketplaceModel is provided', () => {
      const service = new MarketplaceService();
      expect(mockGetPool).toHaveBeenCalled();
      expect(service).toBeInstanceOf(MarketplaceService);
    });
  });

  describe('createMineralListing', () => {
    const mockListingData: MineralListingData = {
      user_id: 1,
      commodity_type: 'Gold',
      volume: 100,
      volume_unit: 'kg',
      grade: 'A+',
      origin_country: 'Ghana',
      origin_region: 'Ashanti',
      origin_coordinates: { x: 1.5, y: 2.5 },
      price: 50000,
      price_currency: 'USD',
      price_per_unit: 500,
      description: 'High quality gold ore'
    };

    const mockComplianceData: ComplianceData = {
      environmental_score: 85,
      social_score: 90,
      governance_score: 88,
      self_assessment_completed: true,
      third_party_verified: false,
      notes: 'Excellent compliance record'
    };

    test('should create mineral listing successfully with compliance data', async () => {
      const mockListingResult = { rows: [{ id: 123 }] };
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockListingResult) // INSERT listing
        .mockResolvedValueOnce(undefined) // INSERT compliance
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await marketplaceService.createMineralListing(mockListingData, mockComplianceData);

      expect(result).toEqual({ listing_id: 123 });
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should create mineral listing successfully without compliance data', async () => {
      const mockListingResult = { rows: [{ id: 456 }] };
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockListingResult) // INSERT listing
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await marketplaceService.createMineralListing(mockListingData);

      expect(result).toEqual({ listing_id: 456 });
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
    });

    test('should handle coordinates properly when provided', async () => {
      const mockListingResult = { rows: [{ id: 789 }] };
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockListingResult) // INSERT listing
        .mockResolvedValueOnce(undefined); // COMMIT

      await marketplaceService.createMineralListing(mockListingData);

      const insertCall = mockClient.query.mock.calls[1];
      expect(insertCall[1]).toContain('(1.5, 2.5)'); // coordinates formatted correctly
    });

    test('should handle null coordinates when not provided', async () => {
      const listingDataWithoutCoords = { ...mockListingData };
      delete listingDataWithoutCoords.origin_coordinates;
      
      const mockListingResult = { rows: [{ id: 789 }] };
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockListingResult) // INSERT listing
        .mockResolvedValueOnce(undefined); // COMMIT

      await marketplaceService.createMineralListing(listingDataWithoutCoords);

      const insertCall = mockClient.query.mock.calls[1];
      expect(insertCall[1]).toContain(null); // coordinates should be null
    });

    test('should rollback transaction on error', async () => {
      const error = new Error('Database error');
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // INSERT listing fails

      await expect(marketplaceService.createMineralListing(mockListingData)).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle compliance data with default values', async () => {
      const partialComplianceData: ComplianceData = {
        environmental_score: 75,
        notes: 'Good compliance'
      };

      const mockListingResult = { rows: [{ id: 999 }] };
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockListingResult) // INSERT listing
        .mockResolvedValueOnce(undefined) // INSERT compliance
        .mockResolvedValueOnce(undefined); // COMMIT

      await marketplaceService.createMineralListing(mockListingData, partialComplianceData);

      const complianceCall = mockClient.query.mock.calls[2];
      expect(complianceCall[1]).toEqual([
        999, // listing_id
        75, // environmental_score
        undefined, // social_score
        undefined, // governance_score
        false, // self_assessment_completed (default)
        false, // third_party_verified (default)
        'Good compliance' // notes
      ]);
    });
  });

  describe('getMineralListings', () => {
    const mockListings = [
      {
        id: 1,
        commodity_type: 'Gold',
        volume: 100,
        price: 50000,
        environmental_score: 85
      },
      {
        id: 2,
        commodity_type: 'Silver',
        volume: 200,
        price: 30000,
        environmental_score: 80
      }
    ];

    test('should get all mineral listings without filters', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockListings });

      const result = await marketplaceService.getMineralListings();

      expect(result).toEqual(mockListings);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT ml.*, mlc.environmental_score'),
        []
      );
    });

    test('should apply commodity type filter', async () => {
      const filters: MineralListingFilter = { commodity_type: 'Gold' };
      mockPool.query.mockResolvedValueOnce({ rows: [mockListings[0]] });

      const result = await marketplaceService.getMineralListings(filters);

      expect(result).toEqual([mockListings[0]]);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND ml.commodity_type = $1'),
        ['Gold']
      );
    });

    test('should apply multiple filters', async () => {
      const filters: MineralListingFilter = {
        commodity_type: 'Gold',
        origin_country: 'Ghana',
        min_price: 40000,
        max_price: 60000,
        available_only: true
      };
      
      mockPool.query.mockResolvedValueOnce({ rows: [mockListings[0]] });

      await marketplaceService.getMineralListings(filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND ml.commodity_type = $1'),
        ['Gold', 'Ghana', 40000, 60000]
      );
    });

    test('should apply sorting and pagination', async () => {
      const filters: MineralListingFilter = {
        sort_by: 'price',
        sort_direction: 'asc',
        limit: 10,
        page: 2
      };
      
      mockPool.query.mockResolvedValueOnce({ rows: mockListings });

      await marketplaceService.getMineralListings(filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY ml.price asc LIMIT $1 OFFSET $2'),
        [10, 10] // limit and offset (page 2 = offset 10)
      );
    });

    test('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(error);

      await expect(marketplaceService.getMineralListings()).rejects.toThrow('Database connection failed');
    });
  });

  describe('getMineralListingById', () => {
    const mockListing = {
      id: 1,
      commodity_type: 'Gold',
      volume: 100,
      environmental_score: 85
    };

    test('should get mineral listing by ID successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockListing] });

      const result = await marketplaceService.getMineralListingById(1);

      expect(result).toEqual(mockListing);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ml.id = $1'),
        [1]
      );
    });

    test('should return null when listing not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await marketplaceService.getMineralListingById(999);

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      const error = new Error('Database error');
      mockPool.query.mockRejectedValueOnce(error);

      await expect(marketplaceService.getMineralListingById(1)).rejects.toThrow('Database error');
    });
  });

  describe('updateMineralListing', () => {
    const mockExistingListing = {
      id: 1,
      commodity_type: 'Gold',
      volume: 100
    };

    const mockUpdatedListing = {
      id: 1,
      commodity_type: 'Silver',
      volume: 150,
      price: 35000
    };

    test('should update mineral listing successfully', async () => {
      const updateData = {
        commodity_type: 'Silver',
        volume: 150,
        price: 35000
      };

      // Mock the existence check and update query
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockExistingListing] }) // getMineralListingById
        .mockResolvedValueOnce({ rows: [mockUpdatedListing] }); // update query

      const result = await marketplaceService.updateMineralListing(1, updateData);

      expect(result).toEqual(mockUpdatedListing);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    test('should throw error when listing not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // getMineralListingById returns empty

      await expect(marketplaceService.updateMineralListing(999, { price: 1000 }))
        .rejects.toThrow('Listing not found');
    });

    test('should return message when no fields to update', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockExistingListing] }); // getMineralListingById

      const result = await marketplaceService.updateMineralListing(1, {});

      expect(result).toEqual({ message: 'No fields to update' });
      expect(mockPool.query).toHaveBeenCalledTimes(1); // Only the existence check
    });

    test('should handle partial updates', async () => {
      const updateData = { price: 45000 };
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockExistingListing] }) // getMineralListingById
        .mockResolvedValueOnce({ rows: [{ ...mockExistingListing, price: 45000 }] }); // update

      await marketplaceService.updateMineralListing(1, updateData);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    test('should handle database errors', async () => {
      const error = new Error('Update failed');
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockExistingListing] }) // getMineralListingById
        .mockRejectedValueOnce(error); // update fails

      await expect(marketplaceService.updateMineralListing(1, { price: 1000 }))
        .rejects.toThrow('Update failed');
    });
  });

  describe('deleteMineralListing', () => {
    test('should delete mineral listing successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // DELETE compliance
        .mockResolvedValueOnce({ rowCount: 1 }) // DELETE listing
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await marketplaceService.deleteMineralListing(1);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
    });

    test('should return false when listing not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0 }) // DELETE compliance
        .mockResolvedValueOnce({ rowCount: 0 }) // DELETE listing (not found)
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await marketplaceService.deleteMineralListing(999);

      expect(result).toBe(false);
    });

    test('should rollback transaction on error', async () => {
      const error = new Error('Delete failed');
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // DELETE compliance fails

      await expect(marketplaceService.deleteMineralListing(1)).rejects.toThrow('Delete failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('createMineralOffer', () => {
    const mockOfferData: MineralOffer = {
      listing_id: 1,
      buyer_id: 2,
      offer_price: 45000,
      currency: 'USD',
      volume: 50,
      status: 'pending',
      message: 'Interested in this listing'
    };

    test('should create mineral offer successfully', async () => {
      // Mock the listing existence check and offer creation
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // getMineralListingById
        .mockResolvedValueOnce({ rows: [{ id: 123 }] }); // createOffer

      const result = await marketplaceService.createMineralOffer(mockOfferData);

      expect(result).toEqual({ offer_id: 123 });
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    test('should throw error when listing not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // getMineralListingById returns empty

      await expect(marketplaceService.createMineralOffer(mockOfferData))
        .rejects.toThrow('Listing not found');
    });

    test('should use default status when not provided', async () => {
      const offerWithoutStatus = { ...mockOfferData };
      delete offerWithoutStatus.status;
      
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // getMineralListingById
        .mockResolvedValueOnce({ rows: [{ id: 456 }] }); // createOffer

      await marketplaceService.createMineralOffer(offerWithoutStatus);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    test('should handle database errors', async () => {
      const error = new Error('Insert failed');
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // getMineralListingById
        .mockRejectedValueOnce(error); // createOffer fails

      await expect(marketplaceService.createMineralOffer(mockOfferData))
        .rejects.toThrow('Insert failed');
    });
  });

  describe('updateOfferStatus', () => {
    const mockUpdatedOffer = {
      id: 1,
      status: 'accepted',
      listing_id: 1,
      buyer_id: 2
    };

    test('should update offer status successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockUpdatedOffer] });

      const result = await marketplaceService.updateOfferStatus(1, 'accepted');

      expect(result).toEqual(mockUpdatedOffer);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['accepted', 1]
      );
    });

    test('should throw error when offer not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(marketplaceService.updateOfferStatus(999, 'accepted'))
        .rejects.toThrow('Offer not found');
    });

    test('should handle database errors', async () => {
      const error = new Error('Update failed');
      mockPool.query.mockRejectedValueOnce(error);

      await expect(marketplaceService.updateOfferStatus(1, 'accepted'))
        .rejects.toThrow('Update failed');
    });
  });

  describe('getOffersForListing', () => {
    const mockOffers = [
      {
        id: 1,
        listing_id: 1,
        buyer_id: 2,
        offer_price: 45000,
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      }
    ];

    test('should get offers for listing successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockOffers });

      const result = await marketplaceService.getOffersForListing(1);

      expect(result).toEqual(mockOffers);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE mo.listing_id = $1'),
        [1]
      );
    });

    test('should return empty array when no offers found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await marketplaceService.getOffersForListing(999);

      expect(result).toEqual([]);
    });

    test('should handle database errors', async () => {
      const error = new Error('Query failed');
      mockPool.query.mockRejectedValueOnce(error);

      await expect(marketplaceService.getOffersForListing(1))
        .rejects.toThrow('Query failed');
    });
  });

  describe('getOffersByBuyer', () => {
    const mockBuyerOffers = [
      {
        id: 1,
        buyer_id: 2,
        listing_id: 1,
        commodity_type: 'Gold',
        listing_volume: 100,
        listing_price: 50000
      }
    ];

    test('should get offers by buyer successfully', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: mockBuyerOffers });

      const result = await marketplaceService.getOffersByBuyer(2);

      expect(result).toEqual(mockBuyerOffers);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE mo.buyer_id = $1'),
        [2]
      );
    });

    test('should return empty array when no offers found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await marketplaceService.getOffersByBuyer(999);

      expect(result).toEqual([]);
    });

    test('should handle database errors', async () => {
      const error = new Error('Query failed');
      mockPool.query.mockRejectedValueOnce(error);

      await expect(marketplaceService.getOffersByBuyer(2))
        .rejects.toThrow('Query failed');
    });
  });
});

