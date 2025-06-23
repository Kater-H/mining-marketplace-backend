// Mock external dependencies before importing mineralListingModel
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../../config/database', () => ({
  pgPool: {
    connect: jest.fn(),
    query: jest.fn(),
  },
}));

import { 
  MineralListingModel, 
  CreateMineralListingData, 
  UpdateMineralListingData, 
  MineralListing,
  MineralListingFilter,
  ComplianceData
} from '../../models/mineralListingModel';
import { pgPool } from '../../config/database';

// Get the mocked functions
const mockPgPool = pgPool as jest.Mocked<typeof pgPool>;

describe('MineralListingModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default database connection mock
    mockPgPool.connect.mockResolvedValue(mockClient as any);
  });

  describe('findById', () => {
    const mockListing: MineralListing = {
      id: 1,
      user_id: 1,
      commodity_type: 'Gold',
      volume: 100.5,
      grade: 'A+',
      origin_location: 'Ghana',
      price_per_unit: 1800.00,
      currency: 'USD',
      available: true,
      description: 'High quality gold ore',
      images: ['image1.jpg', 'image2.jpg'],
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      status: 'active',
      compliance_score: 95.5,
      verified: true,
      verification_date: new Date('2024-01-01'),
      verified_by: 'admin@example.com',
    };

    test('should find listing by ID successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [mockListing] } as any);

      const result = await MineralListingModel.findById(1);

      expect(result).toEqual(mockListing);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT * FROM mineral_listings WHERE id = $1',
        [1]
      );
    });

    test('should return null when listing not found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await MineralListingModel.findById(999);

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(MineralListingModel.findById(1)).rejects.toThrow('Database connection failed');
    });
  });

  describe('findByUserId', () => {
    const mockListings: MineralListing[] = [
      {
        id: 1,
        user_id: 1,
        commodity_type: 'Gold',
        volume: 100.5,
        grade: 'A+',
        origin_location: 'Ghana',
        price_per_unit: 1800.00,
        currency: 'USD',
        available: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        status: 'active',
        verified: true,
      },
      {
        id: 2,
        user_id: 1,
        commodity_type: 'Silver',
        volume: 200.0,
        grade: 'B+',
        origin_location: 'Peru',
        price_per_unit: 25.00,
        currency: 'USD',
        available: false,
        created_at: new Date('2024-01-02'),
        updated_at: new Date('2024-01-02'),
        status: 'sold',
        verified: false,
      },
    ] as MineralListing[];

    test('should find listings by user ID successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: mockListings } as any);

      const result = await MineralListingModel.findByUserId(1);

      expect(result).toEqual(mockListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT * FROM mineral_listings WHERE user_id = $1 ORDER BY created_at DESC',
        [1]
      );
    });

    test('should return empty array when no listings found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await MineralListingModel.findByUserId(999);

      expect(result).toEqual([]);
    });

    test('should handle database errors', async () => {
      const error = new Error('User listings query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(MineralListingModel.findByUserId(1)).rejects.toThrow('User listings query failed');
    });
  });

  describe('create', () => {
    const mockListingData: CreateMineralListingData = {
      user_id: 1,
      commodity_type: 'Diamond',
      volume: 50.0,
      grade: 'Premium',
      origin_location: 'Botswana',
      price_per_unit: 5000.00,
      currency: 'USD',
      available: true,
      description: 'High quality diamonds',
      images: ['diamond1.jpg', 'diamond2.jpg'],
      status: 'active',
    };

    const mockCreatedListing: MineralListing = {
      id: 3,
      ...mockListingData,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
      verified: false,
    } as MineralListing;

    test('should create listing successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCreatedListing] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.create(mockListingData);

      expect(result).toEqual(mockCreatedListing);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Constraint violation');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // INSERT fails

      await expect(MineralListingModel.create(mockListingData)).rejects.toThrow('Constraint violation');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should create listing with minimal data', async () => {
      const minimalListingData: CreateMineralListingData = {
        user_id: 1,
        commodity_type: 'Copper',
        volume: 100.0,
        grade: 'Standard',
        origin_location: 'Chile',
        price_per_unit: 8.50,
        currency: 'USD',
      };

      const mockMinimalListing: MineralListing = {
        id: 4,
        ...minimalListingData,
        available: true,
        status: 'active',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        verified: false,
      } as MineralListing;

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockMinimalListing] }) // INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.create(minimalListingData);

      expect(result).toEqual(mockMinimalListing);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, expect.stringContaining('INSERT INTO mineral_listings'), [
        1, 'Copper', 100.0, 'Standard', 'Chile', 8.50, 'USD', true, null, null, 'active'
      ]);
    });
  });

  describe('update', () => {
    const mockUpdateData: UpdateMineralListingData = {
      price_per_unit: 1900.00,
      available: false,
      status: 'sold',
      compliance_score: 98.5,
    };

    const mockUpdatedListing: MineralListing = {
      id: 1,
      user_id: 1,
      commodity_type: 'Gold',
      volume: 100.5,
      grade: 'A+',
      origin_location: 'Ghana',
      price_per_unit: 1900.00,
      currency: 'USD',
      available: false,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      status: 'sold',
      compliance_score: 98.5,
      verified: true,
    } as MineralListing;

    test('should update listing successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUpdatedListing] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.update(1, mockUpdateData);

      expect(result).toEqual(mockUpdatedListing);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(3, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return null when listing not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.update(999, mockUpdateData);

      expect(result).toBeNull();
    });

    test('should handle empty update data', async () => {
      await expect(MineralListingModel.update(1, {})).rejects.toThrow('No fields to update');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Update failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // UPDATE fails

      await expect(MineralListingModel.update(1, mockUpdateData)).rejects.toThrow('Update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should update single field', async () => {
      const singleFieldUpdate = { available: false };
      
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUpdatedListing] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.update(1, singleFieldUpdate);

      expect(result).toEqual(mockUpdatedListing);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('available = $1'),
        [false, 1]
      );
    });
  });

  describe('delete', () => {
    test('should delete listing successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // DELETE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.delete(1);

      expect(result).toBe(true);
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 'DELETE FROM mineral_listings WHERE id = $1', [1]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return false when listing not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0 }) // DELETE returns 0 rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.delete(999);

      expect(result).toBe(false);
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Delete failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // DELETE fails

      await expect(MineralListingModel.delete(1)).rejects.toThrow('Delete failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should handle null rowCount', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rowCount: null }) // DELETE returns null rowCount
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.delete(1);

      expect(result).toBe(false);
    });
  });

  describe('addPhoto', () => {
    const mockListingWithPhoto: MineralListing = {
      id: 1,
      user_id: 1,
      commodity_type: 'Gold',
      volume: 100.5,
      grade: 'A+',
      origin_location: 'Ghana',
      price_per_unit: 1800.00,
      currency: 'USD',
      available: true,
      images: ['existing.jpg', 'new_photo.jpg'],
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      status: 'active',
      verified: false,
    } as MineralListing;

    test('should add photo successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockListingWithPhoto] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.addPhoto(1, 'new_photo.jpg');

      expect(result).toEqual(mockListingWithPhoto);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('images = COALESCE(images'),
        [['new_photo.jpg'], 1]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return null when listing not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.addPhoto(999, 'photo.jpg');

      expect(result).toBeNull();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Photo add failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // UPDATE fails

      await expect(MineralListingModel.addPhoto(1, 'photo.jpg')).rejects.toThrow('Photo add failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('deletePhoto', () => {
    const mockListingWithoutPhoto: MineralListing = {
      id: 1,
      user_id: 1,
      commodity_type: 'Gold',
      volume: 100.5,
      grade: 'A+',
      origin_location: 'Ghana',
      price_per_unit: 1800.00,
      currency: 'USD',
      available: true,
      images: ['remaining.jpg'],
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      status: 'active',
      verified: false,
    } as MineralListing;

    test('should delete photo successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockListingWithoutPhoto] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.deletePhoto(1, 'deleted_photo.jpg');

      expect(result).toEqual(mockListingWithoutPhoto);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('array_remove'),
        ['deleted_photo.jpg', 1]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return null when listing not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.deletePhoto(999, 'photo.jpg');

      expect(result).toBeNull();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Photo delete failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // UPDATE fails

      await expect(MineralListingModel.deletePhoto(1, 'photo.jpg')).rejects.toThrow('Photo delete failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    const mockListingWithNewStatus: MineralListing = {
      id: 1,
      user_id: 1,
      commodity_type: 'Gold',
      volume: 100.5,
      grade: 'A+',
      origin_location: 'Ghana',
      price_per_unit: 1800.00,
      currency: 'USD',
      available: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      status: 'sold',
      verified: false,
    } as MineralListing;

    test('should update status successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockListingWithNewStatus] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.updateStatus(1, 'sold');

      expect(result).toEqual(mockListingWithNewStatus);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('status = $1'),
        ['sold', 1]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return null when listing not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.updateStatus(999, 'sold');

      expect(result).toBeNull();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Status update failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // UPDATE fails

      await expect(MineralListingModel.updateStatus(1, 'sold')).rejects.toThrow('Status update failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findWithFilters', () => {
    const mockFilteredListings: MineralListing[] = [
      {
        id: 1,
        user_id: 1,
        commodity_type: 'Gold',
        volume: 100.5,
        grade: 'A+',
        origin_location: 'Ghana',
        price_per_unit: 1800.00,
        currency: 'USD',
        available: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        status: 'active',
        verified: true,
        compliance_score: 95.5,
      },
    ] as MineralListing[];

    test('should find listings with commodity type filter', async () => {
      const filters: MineralListingFilter = {
        commodity_type: 'Gold',
        page: 1,
        limit: 10,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredListings } as any);

      const result = await MineralListingModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('commodity_type = $1'),
        ['Gold', 10, 0]
      );
    });

    test('should find listings with price range filters', async () => {
      const filters: MineralListingFilter = {
        min_price: 1000,
        max_price: 2000,
        page: 1,
        limit: 5,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredListings } as any);

      const result = await MineralListingModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('price_per_unit >= $1 AND price_per_unit <= $2'),
        [1000, 2000, 5, 0]
      );
    });

    test('should find listings with volume range filters', async () => {
      const filters: MineralListingFilter = {
        min_volume: 50,
        max_volume: 200,
        page: 2,
        limit: 10,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredListings } as any);

      const result = await MineralListingModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('volume >= $1 AND volume <= $2'),
        [50, 200, 10, 10] // page 2 with limit 10 = offset 10
      );
    });

    test('should find listings with location filter', async () => {
      const filters: MineralListingFilter = {
        origin_location: 'Ghana',
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredListings } as any);

      const result = await MineralListingModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('origin_location ILIKE $1'),
        ['%Ghana%', 10, 0]
      );
    });

    test('should find listings with compliance score filter', async () => {
      const filters: MineralListingFilter = {
        min_compliance_score: 90,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredListings } as any);

      const result = await MineralListingModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('compliance_score >= $1'),
        [90, 10, 0]
      );
    });

    test('should find listings with available only filter', async () => {
      const filters: MineralListingFilter = {
        available_only: true,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredListings } as any);

      const result = await MineralListingModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('available = true'),
        [10, 0]
      );
    });

    test('should find listings with verified only filter', async () => {
      const filters: MineralListingFilter = {
        verified_only: true,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredListings } as any);

      const result = await MineralListingModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('verified = true'),
        [10, 0]
      );
    });

    test('should find listings with user ID filter', async () => {
      const filters: MineralListingFilter = {
        user_id: 1,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredListings } as any);

      const result = await MineralListingModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1'),
        [1, 10, 0]
      );
    });

    test('should find listings with status filter', async () => {
      const filters: MineralListingFilter = {
        status: 'active',
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredListings } as any);

      const result = await MineralListingModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        ['active', 10, 0]
      );
    });

    test('should find listings with custom sorting', async () => {
      const filters: MineralListingFilter = {
        sort_by: 'price_per_unit',
        sort_direction: 'asc',
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredListings } as any);

      const result = await MineralListingModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY price_per_unit ASC'),
        [10, 0]
      );
    });

    test('should find listings with multiple filters combined', async () => {
      const filters: MineralListingFilter = {
        commodity_type: 'Gold',
        min_price: 1500,
        max_price: 2000,
        available_only: true,
        verified_only: true,
        min_compliance_score: 90,
        sort_by: 'created_at',
        sort_direction: 'desc',
        page: 1,
        limit: 5,
      };

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredListings } as any);

      const result = await MineralListingModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('commodity_type = $1'),
        ['Gold', 1500, 2000, 90, 5, 0]
      );
    });

    test('should use default pagination and sorting', async () => {
      const filters: MineralListingFilter = {};

      mockPgPool.query.mockResolvedValue({ rows: mockFilteredListings } as any);

      const result = await MineralListingModel.findWithFilters(filters);

      expect(result).toEqual(mockFilteredListings);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC LIMIT $1 OFFSET $2'),
        [10, 0]
      );
    });

    test('should handle database errors', async () => {
      const error = new Error('Filter query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(MineralListingModel.findWithFilters({})).rejects.toThrow('Filter query failed');
    });
  });

  describe('getTotalCount', () => {
    test('should get total count with filters', async () => {
      const filters: MineralListingFilter = {
        commodity_type: 'Gold',
        available_only: true,
      };

      mockPgPool.query.mockResolvedValue({ rows: [{ count: '25' }] } as any);

      const result = await MineralListingModel.getTotalCount(filters);

      expect(result).toBe(25);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) FROM mineral_listings'),
        ['Gold']
      );
    });

    test('should get total count without filters', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [{ count: '100' }] } as any);

      const result = await MineralListingModel.getTotalCount({});

      expect(result).toBe(100);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) FROM mineral_listings WHERE 1=1',
        []
      );
    });

    test('should handle database errors', async () => {
      const error = new Error('Count query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(MineralListingModel.getTotalCount({})).rejects.toThrow('Count query failed');
    });
  });

  describe('findAll', () => {
    const mockListings: MineralListing[] = [
      {
        id: 1,
        user_id: 1,
        commodity_type: 'Gold',
        volume: 100.5,
        grade: 'A+',
        origin_location: 'Ghana',
        price_per_unit: 1800.00,
        currency: 'USD',
        available: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
        status: 'active',
        verified: true,
      },
      {
        id: 2,
        user_id: 2,
        commodity_type: 'Silver',
        volume: 200.0,
        grade: 'B+',
        origin_location: 'Peru',
        price_per_unit: 25.00,
        currency: 'USD',
        available: false,
        created_at: new Date('2024-01-02'),
        updated_at: new Date('2024-01-02'),
        status: 'sold',
        verified: false,
      },
    ] as MineralListing[];

    test('should find all listings with pagination', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '50' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: mockListings }); // SELECT query

      const result = await MineralListingModel.findAll(1, 10);

      expect(result).toEqual({
        listings: mockListings,
        total: 50
      });

      expect(mockPgPool.query).toHaveBeenCalledTimes(2);
      expect(mockPgPool.query).toHaveBeenNthCalledWith(1, 'SELECT COUNT(*) FROM mineral_listings');
      expect(mockPgPool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 0]
      );
    });

    test('should handle pagination correctly', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: mockListings }); // SELECT query

      const result = await MineralListingModel.findAll(3, 20);

      expect(result.total).toBe(100);
      expect(mockPgPool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [20, 40] // page 3 with limit 20 = offset 40
      );
    });

    test('should use default pagination values', async () => {
      mockPgPool.query
        .mockResolvedValueOnce({ rows: [{ count: '15' }] }) // COUNT query
        .mockResolvedValueOnce({ rows: mockListings }); // SELECT query

      const result = await MineralListingModel.findAll();

      expect(mockPgPool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [10, 0] // default page 1, limit 10
      );
    });

    test('should handle database errors', async () => {
      const error = new Error('Find all query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(MineralListingModel.findAll()).rejects.toThrow('Find all query failed');
    });
  });

  describe('addComplianceData', () => {
    const mockComplianceData = {
      certification_type: 'ISO 14001',
      certification_id: 'ISO-2024-001',
      certification_date: new Date('2024-01-01'),
      expiry_date: new Date('2025-01-01'),
      compliance_score: 95.5,
      verified_by: 'verifier@example.com',
    };

    const mockCreatedCompliance: ComplianceData = {
      listing_id: 1,
      ...mockComplianceData,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    };

    test('should add compliance data successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCreatedCompliance] }) // INSERT compliance
        .mockResolvedValueOnce(undefined) // UPDATE listing compliance score
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.addComplianceData(1, mockComplianceData);

      expect(result).toEqual(mockCreatedCompliance);
      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should add compliance data without score update', async () => {
      const complianceWithoutScore = {
        certification_type: 'ISO 9001',
        certification_id: 'ISO-2024-002',
        certification_date: new Date('2024-01-01'),
        verified_by: 'verifier@example.com',
      };

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockCreatedCompliance] }) // INSERT compliance
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.addComplianceData(1, complianceWithoutScore);

      expect(result).toEqual(mockCreatedCompliance);
      expect(mockClient.query).toHaveBeenCalledTimes(3); // No compliance score update
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Compliance insert failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // INSERT fails

      await expect(MineralListingModel.addComplianceData(1, mockComplianceData)).rejects.toThrow('Compliance insert failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getComplianceData', () => {
    const mockComplianceList: ComplianceData[] = [
      {
        listing_id: 1,
        certification_type: 'ISO 14001',
        certification_id: 'ISO-2024-001',
        certification_date: new Date('2024-01-01'),
        expiry_date: new Date('2025-01-01'),
        compliance_score: 95.5,
        verified_by: 'verifier@example.com',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      },
    ];

    test('should get compliance data successfully', async () => {
      mockPgPool.query.mockResolvedValue({ rows: mockComplianceList } as any);

      const result = await MineralListingModel.getComplianceData(1);

      expect(result).toEqual(mockComplianceList);
      expect(mockPgPool.query).toHaveBeenCalledWith(
        'SELECT * FROM listing_compliance WHERE listing_id = $1 ORDER BY created_at DESC',
        [1]
      );
    });

    test('should return empty array when no compliance data found', async () => {
      mockPgPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await MineralListingModel.getComplianceData(999);

      expect(result).toEqual([]);
    });

    test('should handle database errors', async () => {
      const error = new Error('Compliance query failed');
      mockPgPool.query.mockRejectedValue(error);

      await expect(MineralListingModel.getComplianceData(1)).rejects.toThrow('Compliance query failed');
    });
  });

  describe('verifyListing', () => {
    const mockVerifiedListing: MineralListing = {
      id: 1,
      user_id: 1,
      commodity_type: 'Gold',
      volume: 100.5,
      grade: 'A+',
      origin_location: 'Ghana',
      price_per_unit: 1800.00,
      currency: 'USD',
      available: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-02'),
      status: 'active',
      verified: true,
      verification_date: new Date('2024-01-02'),
      verified_by: 'admin@example.com',
    } as MineralListing;

    test('should verify listing successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockVerifiedListing] }) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.verifyListing(1, 'admin@example.com');

      expect(result).toEqual(mockVerifiedListing);
      expect(mockClient.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('verified = true'),
        ['admin@example.com', 1]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should return null when listing not found', async () => {
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE returns no rows
        .mockResolvedValueOnce(undefined); // COMMIT

      const result = await MineralListingModel.verifyListing(999, 'admin@example.com');

      expect(result).toBeNull();
    });

    test('should handle database errors and rollback', async () => {
      const error = new Error('Verification failed');
      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(error); // UPDATE fails

      await expect(MineralListingModel.verifyListing(1, 'admin@example.com')).rejects.toThrow('Verification failed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});

