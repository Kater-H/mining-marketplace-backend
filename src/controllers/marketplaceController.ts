import { Request, Response } from 'express';
import { MarketplaceService } from '../services/marketplaceService.ts'; // <--- Add .ts here
import { MineralOffer } from '../models/interfaces/marketplace.ts'; // <--- Add .ts here

// Create instance of MarketplaceService for controller functions
export const marketplaceService = new MarketplaceService(); // Export the instance

// Export standalone functions for routes
export const createMineralListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      commodity_type, volume, volume_unit, grade,
      origin_country, origin_region, origin_coordinates,
      price, price_currency, price_per_unit, description,
      environmental_score, social_score, governance_score, notes
    } = req.body;

    // Validate required fields
    if (!commodity_type || !volume || !volume_unit || !origin_country || !origin_region) {
      res.status(400).json({
        error: 'Missing required fields'
      });
      return;
    }

    // Get user ID from auth middleware
    const userId = (req as any).user.id;

    // Prepare listing data
    const listingData = {
      user_id: userId,
      commodity_type,
      volume,
      volume_unit,
      grade,
      origin_location: origin_country, // Use origin_country as origin_location
      origin_country,
      origin_region,
      origin_coordinates,
      price,
      price_currency,
      price_per_unit,
      currency: price_currency || 'USD', // Use price_currency or default to USD
      available: true, // Default to available
      description
    };

    // Prepare compliance data if provided
    const complianceData = environmental_score || social_score || governance_score || notes
      ? {
          environmental_score,
          social_score,
          governance_score,
          notes
        }
      : undefined;

    // Create listing
    const result = await marketplaceService.createMineralListing(listingData, complianceData);

    // Get the created listing to return full data
    const createdListing = await marketplaceService.getMineralListingById(result.listing_id);

    // Return response with full listing data
    res.status(201).json({
      message: 'Mineral listing created successfully',
      listing: createdListing
    });
  } catch (error) {
    console.error('Error creating mineral listing:', error);
    res.status(500).json({ message: 'Server error during listing creation' });
  }
};

export const getMineralListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, commodity_type, origin_location, min_price, max_price, available_only } = req.query;

    const filters = {
      commodity_type: commodity_type as string,
      origin_location: origin_location as string,
      min_price: min_price ? parseFloat(min_price as string) : undefined,
      max_price: max_price ? parseFloat(max_price as string) : undefined,
      available_only: available_only === 'true',
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    const listings = await marketplaceService.getMineralListings(filters);

    res.status(200).json({
      listings,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: listings.length
      }
    });
  } catch (error) {
    console.error('Error getting mineral listings:', error);
    res.status(500).json({ message: 'Server error during listings retrieval' });
  }
};

export const getMineralListingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const listing = await marketplaceService.getMineralListingById(parseInt(id));

    if (!listing) {
      res.status(404).json({ message: 'Mineral listing not found' });
      return;
    }

    res.status(200).json({
      listing
    });
  } catch (error) {
    console.error('Error getting mineral listing:', error);
    res.status(500).json({ message: 'Server error during listing retrieval' });
  }
};

export const updateMineralListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate input data
    if (updateData.volume !== undefined && (updateData.volume < 0 || isNaN(updateData.volume))) {
      res.status(400).json({ message: 'Volume must be a positive number' });
      return;
    }

    if (updateData.price_per_unit !== undefined && (updateData.price_per_unit < 0 || isNaN(updateData.price_per_unit))) {
      res.status(400).json({ message: 'Price per unit must be a positive number' });
      return;
    }

    // Get user ID from auth middleware
    const userId = (req as any).user.id;

    const result = await marketplaceService.updateMineralListing(parseInt(id), updateData, userId);

    if (!result) {
      res.status(404).json({ message: 'Mineral listing not found or unauthorized' });
      return;
    }

    res.status(200).json({
      message: 'Listing updated successfully',
      listing: result
    });
  } catch (error: any) {
    console.error('Error updating mineral listing:', error);

    if (error.message === 'Listing not found') {
      res.status(404).json({ message: 'Mineral listing not found' });
    } else if (error.message.includes('Unauthorized')) {
      res.status(403).json({ message: 'Insufficient permissions' });
    } else {
      res.status(500).json({ message: 'Server error during listing update' });
    }
  }
};

export const deleteMineralListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get user ID from auth middleware
    const userId = (req as any).user.id;

    const result = await marketplaceService.deleteMineralListing(parseInt(id), userId);

    if (!result) {
      res.status(404).json({ message: 'Mineral listing not found or unauthorized' });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting mineral listing:', error);

    if (error.message === 'Listing not found') {
      res.status(404).json({ message: 'Mineral listing not found' });
    } else if (error.message.includes('Unauthorized')) {
      res.status(403).json({ message: 'Insufficient permissions' });
    } else {
      res.status(500).json({ message: 'Server error during listing deletion' });
    }
  }
};

export const addPhotoToListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { listing_id } = req.params;
    const { photo_url } = req.body;

    if (!photo_url) {
      res.status(400).json({ error: 'Photo URL is required' });
      return;
    }

    // Get user ID from auth middleware
    const userId = (req as any).user.id;

    const result = await marketplaceService.addPhotoToListing(parseInt(listing_id), photo_url, userId);

    if (!result) {
      res.status(404).json({ message: 'Mineral listing not found or unauthorized' });
      return;
    }

    res.status(200).json({ message: 'Photo added successfully', photo_url });
  } catch (error) {
    console.error('Error adding photo to listing:', error);
    res.status(500).json({ message: 'Server error during photo addition' });
  }
};