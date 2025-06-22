import { Request, Response } from 'express';
import { MarketplaceService } from '../services/marketplaceService';
import { MineralOffer } from '../models/interfaces/marketplace';

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
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Prepare listing data
    const listingData = {
      user_id: userId,
      commodity_type,
      volume: parseFloat(volume),
      volume_unit,
      grade: grade ? parseFloat(grade) : undefined,
      origin_location: origin_country, // Use origin_country as origin_location
      origin_country,
      origin_region,
      origin_coordinates,
      price: price ? parseFloat(price) : undefined,
      price_currency: price_currency || 'USD',
      price_per_unit: price_per_unit ? parseFloat(price_per_unit) : undefined,
      currency: price_currency || 'USD', // Use price_currency or default to USD
      available: true, // Default to available
      description
    };

    // Prepare compliance data if provided
    const complianceData = environmental_score || social_score || governance_score || notes
      ? {
          environmental_score: environmental_score ? parseFloat(environmental_score) : undefined,
          social_score: social_score ? parseFloat(social_score) : undefined,
          governance_score: governance_score ? parseFloat(governance_score) : undefined,
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
    if (updateData.volume !== undefined) {
      const volumeNum = parseFloat(updateData.volume);
      if (isNaN(volumeNum) || volumeNum < 0) {
        res.status(400).json({ message: 'Volume must be a positive number' });
        return;
      }
      updateData.volume = volumeNum;
    }

    if (updateData.price_per_unit !== undefined) {
      const priceNum = parseFloat(updateData.price_per_unit);
      if (isNaN(priceNum) || priceNum < 0) {
        res.status(400).json({ message: 'Price per unit must be a positive number' });
        return;
      }
      updateData.price_per_unit = priceNum;
    }

    // Get user ID from auth middleware
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const result = await marketplaceService.updateMineralListing(parseInt(id), updateData, userId);

    if (!result) {
      res.status(404).json({ message: 'Mineral listing not found or unauthorized' });
      return;
    }

    res.status(200).json({
      message: 'Listing updated successfully',
      listing: result
    });
  } catch (error) {
    console.error('Error updating mineral listing:', error);
    res.status(500).json({ message: 'Server error during listing update' });
  }
};

export const deleteMineralListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get user ID from auth middleware
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const result = await marketplaceService.deleteMineralListing(parseInt(id), userId);

    if (!result) {
      res.status(404).json({ message: 'Mineral listing not found or unauthorized' });
      return;
    }

    res.status(200).json({
      message: 'Listing deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting mineral listing:', error);
    res.status(500).json({ message: 'Server error during listing deletion' });
  }
};

export const createMineralOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { listing_id, offered_price, offered_volume, message } = req.body;

    // Validate required fields
    if (!listing_id || !offered_price || !offered_volume) {
      res.status(400).json({
        error: 'Missing required fields: listing_id, offered_price, offered_volume'
      });
      return;
    }

    // Get user ID from auth middleware
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // Prepare offer data
    const offerData: Partial<MineralOffer> = {
      listing_id: parseInt(listing_id),
      buyer_id: userId,
      offered_price: parseFloat(offered_price),
      offered_volume: parseFloat(offered_volume),
      message,
      status: 'pending'
    };

    const result = await marketplaceService.createMineralOffer(offerData);

    res.status(201).json({
      message: 'Offer created successfully',
      offer: result
    });
  } catch (error) {
    console.error('Error creating mineral offer:', error);
    res.status(500).json({ message: 'Server error during offer creation' });
  }
};

export const getMineralOffers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { listing_id, status } = req.query;

    // Get user ID from auth middleware
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const filters = {
      listing_id: listing_id ? parseInt(listing_id as string) : undefined,
      user_id: userId,
      status: status as string
    };

    const offers = await marketplaceService.getMineralOffers(filters);

    res.status(200).json({
      offers
    });
  } catch (error) {
    console.error('Error getting mineral offers:', error);
    res.status(500).json({ message: 'Server error during offers retrieval' });
  }
};

export const updateMineralOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, response_message } = req.body;

    // Get user ID from auth middleware
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const updateData = {
      status,
      response_message,
      updated_at: new Date()
    };

    const result = await marketplaceService.updateMineralOffer(parseInt(id), updateData, userId);

    if (!result) {
      res.status(404).json({ message: 'Offer not found or unauthorized' });
      return;
    }

    res.status(200).json({
      message: 'Offer updated successfully',
      offer: result
    });
  } catch (error) {
    console.error('Error updating mineral offer:', error);
    res.status(500).json({ message: 'Server error during offer update' });
  }
};
