import { Request, Response } from 'express';
import { MarketplaceService } from '../services/marketplaceService.js';
import { UserService } from '../services/userService.js';
import { UserRole } from '../interfaces/user.js';
import Joi, { ValidationErrorItem } from 'joi';
import {
  createListingSchema,
  updateListingSchema,
  createOfferSchema,
  updateOfferStatusSchema
} from '../validation/marketplaceValidation.js';

const marketplaceService = new MarketplaceService();
const userService = new UserService();

// Helper function for Joi validation
const validateRequest = (schema: Joi.ObjectSchema, data: any, res: Response): boolean => {
  const { error } = schema.validate(data, { abortEarly: false, allowUnknown: false });
  if (error) {
    res.status(400).json({
      message: 'Validation failed',
      errors: error.details.map((detail: ValidationErrorItem) => detail.message)
    });
    return false;
  }
  return true;
};

// Get all mineral listings - RESTORED ORIGINAL FUNCTION WITH DEBUG LOGS
export const getMineralListings = async (req: Request, res: Response): Promise<void> => {
  try {
    // --- SUPER DEBUG LOGS ---
    console.log('🔥🔥🔥 START getMineralListings Controller Execution (Joi Re-enabled) 🔥🔥🔥');
    console.log('🔍 Controller: getMineralListings - Incoming req.query (raw):', req.query);
    // --- END SUPER DEBUG LOGS ---

    const filterSchema = Joi.object({
      mineralType: Joi.string().optional(),
      location: Joi.string().optional(),
      status: Joi.string().valid('available', 'pending', 'sold', 'canceled').optional(),
      minPrice: Joi.number().min(0).optional(),
      maxPrice: Joi.number().min(0).optional(),
      sortBy: Joi.string().valid('created_at', 'price_per_unit', 'quantity').optional(),
      sortDirection: Joi.string().valid('asc', 'desc').optional(),
      limit: Joi.number().integer().min(1).optional(),
      page: Joi.number().integer().min(1).optional()
    }).unknown(true); // Allow unknown keys to avoid validation errors for unexpected params

    // Validate the query parameters
    const { error, value: validatedQueryParams } = filterSchema.validate(req.query);

    if (error) {
      // --- SUPER DEBUG LOGS: Log full error object ---
      console.error('❌❌❌ Controller: Joi validation FAILED for getMineralListings. Full Error Details:', JSON.stringify(error, null, 2));
      // --- END SUPER DEBUG LOGS ---
      res.status(400).json({
        message: 'Invalid filter parameters',
        errors: error.details.map((detail: ValidationErrorItem) => detail.message)
      });
      return;
    }

    // Transform validatedQueryParams (camelCase from frontend) to filters (snake_case for service)
    const filters: any = {};
    if (validatedQueryParams.mineralType) filters.mineral_type = validatedQueryParams.mineralType;
    if (validatedQueryParams.location) filters.location = validatedQueryParams.location;
    if (validatedQueryParams.status) filters.status = validatedQueryParams.status;
    if (validatedQueryParams.minPrice) filters.min_price = validatedQueryParams.minPrice;
    if (validatedQueryParams.maxPrice) filters.max_price = validatedQueryParams.maxPrice;
    if (validatedQueryParams.sortBy) filters.sort_by = validatedQueryParams.sortBy;
    if (validatedQueryParams.sortDirection) filters.sort_direction = validatedQueryParams.sortDirection;
    if (validatedQueryParams.limit) filters.limit = validatedQueryParams.limit;
    if (validatedQueryParams.page) filters.page = validatedQueryParams.page;

    console.log('🔍 Controller: Filters passed to service for getMineralListings:', filters);

    // Pass the transformed filters to the service
    const listings = await marketplaceService.getMineralListings(filters);

    console.log('✅ Controller: Listings received from service. Count:', listings.length);
    if (listings.length > 0) {
      console.log('✅ Controller: First listing data received:', JSON.stringify(listings[0], null, 2));
    }

    res.status(200).json(listings);
    console.log('✅✅✅ END getMineralListings Controller Execution (Success) ✅✅✅');
  } catch (error) {
    // --- SUPER DEBUG LOGS: Log full error object ---
    console.error('❌❌❌ Controller: UNEXPECTED Error in getMineralListings. Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    // --- END SUPER DEBUG LOGS ---
    res.status(500).json({ message: 'Failed to retrieve mineral listings', error: (error as Error).message });
  }
};


// Get mineral listing by ID
export const getMineralListingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId) || listingId <= 0) {
      res.status(400).json({ message: 'Invalid listing ID' });
      return;
    }
    const listing = await marketplaceService.getMineralListingById(listingId);
    if (!listing) {
      res.status(404).json({ message: 'Mineral listing not found' });
      return;
    }
    res.status(200).json(listing);
  } catch (error) {
    console.error('Error getting mineral listing by ID:', error);
    res.status(500).json({ message: 'Failed to retrieve mineral listing', error: (error as Error).message });
  }
};

// Create a new mineral listing (Seller/Admin only)
export const createMineralListing = async (req: Request, res: Response): Promise<void> => {
  try {
    // Joi validation for request body
    if (!validateRequest(createListingSchema, req.body, res)) {
      return;
    }

    const userId = (req as any).user.id;
    const userRoles = (req as any).user.roles; // Get all roles

    // FIX: Check if userRoles includes 'seller' OR 'admin' OR 'miner'
    if (!userRoles.includes('seller') && !userRoles.includes('admin') && !userRoles.includes('miner')) {
      res.status(403).json({ message: 'Forbidden: Only sellers or admins can create listings' });
      return;
    }

    const listingData = { ...req.body, seller_id: userId };
    const { listing_id } = await marketplaceService.createMineralListing(listingData);
    res.status(201).json({ message: 'Mineral listing created successfully', listing_id });
  } catch (error) {
    console.error('Error creating mineral listing:', error);
    res.status(500).json({ message: 'Failed to create mineral listing', error: (error as Error).message });
  }
};

// Update a mineral listing (Owner/Admin only)
export const updateMineralListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId) || listingId <= 0) {
      res.status(400).json({ message: 'Invalid listing ID' });
      return;
    }

    // Joi validation for request body
    if (!validateRequest(updateListingSchema, req.body, res)) {
      return;
    }

    const userId = (req as any).user.id;
    const userRoles = (req as any).user.roles;

    const listing = await marketplaceService.getMineralListingById(listingId);
    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    const updatedListing = await marketplaceService.updateMineralListing(listingId, req.body, userId, userRoles);
    res.status(200).json({ message: 'Mineral listing updated successfully', listing: updatedListing });
  } catch (error) {
    console.error('Error updating mineral listing:', error);
    res.status(500).json({ message: 'Failed to update mineral listing', error: (error as Error).message });
  }
};

// Delete a mineral listing (Owner/Admin only)
export const deleteMineralListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId) || listingId <= 0) {
      res.status(400).json({ message: 'Invalid listing ID' });
      return;
    }

    const userId = (req as any).user.id;
    const userRoles = (req as any).user.roles;

    const listing = await marketplaceService.getMineralListingById(listingId);
    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    const success = await marketplaceService.deleteMineralListing(listingId, userId, userRoles);
    if (success) {
      res.status(204).send();
    } else {
      // This else block might be hit if the service returns false for some reason,
      // though the service now throws on not found or forbidden.
      res.status(404).json({ message: 'Mineral listing not found or not authorized to delete' });
    }
  } catch (error) {
    console.error('❌ Controller: Error deleting mineral listing:', error);
    // Now, catch the specific error thrown by the service
    if ((error as Error).message.includes('FOREIGN_KEY_VIOLATION')) {
      res.status(409).json({
        message: 'Failed to delete listing due to existing related transactions or offers.',
        error: (error as Error).message
      });
    } else if ((error as Error).message.includes('Listing not found')) {
      res.status(404).json({ message: 'Listing not found' });
    } else if ((error as Error).message.includes('Unauthorized')) {
      res.status(403).json({ message: 'Forbidden: You can only delete your own listings or as an admin' });
    }
    else {
      res.status(500).json({ message: 'Failed to delete mineral listing', error: (error as Error).message });
    }
  }
};

// Create a mineral offer
export const createMineralOffer = async (req: Request, res: Response): Promise<void> => {
  try {
    // Joi validation for request body
    if (!validateRequest(createOfferSchema, req.body, res)) {
      return;
    }

    const buyerId = (req as any).user.id;
    const offerData = { ...req.body, buyer_id: buyerId };
    const { offer_id } = await marketplaceService.createMineralOffer(offerData);
    res.status(201).json({ message: 'Mineral offer created successfully', offer_id });
  } catch (error) {
    console.error('Error creating mineral offer:', error);
    res.status(500).json({ message: 'Failed to create mineral offer', error: (error as Error).message });
  }
};

// Update mineral offer status (Seller/Admin only)
export const updateMineralOfferStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const offerId = parseInt(req.params.id);
    if (isNaN(offerId) || offerId <= 0) {
      res.status(400).json({ message: 'Invalid offer ID' });
      return;
    }

    // Joi validation for request body
    if (!validateRequest(updateOfferStatusSchema, req.body, res)) {
      return;
    }

    const { status } = req.body;
    const userId = (req as any).user.id; // Get the ID of the logged-in user
    const userRoles = (req as any).user.roles;

    // Fetch the offer to get its associated listing ID
    const offer = await marketplaceService.getOfferById(offerId); // Assuming a getOfferById method in your service
    if (!offer) {
      res.status(404).json({ message: 'Offer not found' });
      return;
    }

    // Fetch the listing associated with the offer to get the seller_id
    const listing = await marketplaceService.getMineralListingById(offer.listing_id);
    if (!listing) {
      // This case should ideally not happen if data integrity is maintained,
      // but it's good to handle for robustness.
      res.status(404).json({ message: 'Associated listing not found' });
      return;
    }

    // --- MODIFIED AUTHORIZATION LOGIC ---
    // User must be an admin OR the seller of the listing associated with the offer.
    const isOwner = listing.seller_id === userId;
    const isAdmin = userRoles.includes('admin');

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Forbidden: Only the seller of this listing or an admin can update offer status' });
      return;
    }
    // --- END MODIFIED AUTHORIZATION LOGIC ---

    const updatedOffer = await marketplaceService.updateOfferStatus(offerId, status);
    res.status(200).json({ message: 'Offer status updated successfully', offer: updatedOffer });
  } catch (error) {
    console.error('Error updating offer status:', error);
    // You might want to add more specific error handling here based on service errors
    res.status(500).json({ message: 'Failed to update offer status', error: (error as Error).message });
  }
};

// Get offers for a specific listing (Seller/Admin who owns listing or Admin)
export const getOffersForListing = async (req: Request, res: Response): Promise<void> => {
  try {
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId) || listingId <= 0) {
      res.status(400).json({ message: 'Invalid listing ID' });
      return;
    }

    const userId = (req as any).user.id;
    const userRoles = (req as any).user.roles;

    const listing = await marketplaceService.getMineralListingById(listingId);
    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    const isOwner = listing.seller_id === userId;
    const isAdmin = userRoles.includes('admin');

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Forbidden: You can only view offers for your own listings or as an admin' });
      return;
    }

    const offers = await marketplaceService.getOffersForListing(listingId);
    res.status(200).json(offers);
  } catch (error) {
    console.error('Error getting offers for listing:', error);
    res.status(500).json({ message: 'Failed to retrieve offers', error: (error as Error).message });
  }
};

// Get offers made by a specific buyer
export const getOffersByBuyer = async (req: Request, res: Response): Promise<void> => {
  try {
    const buyerId = (req as any).user.id;

    const offers = await marketplaceService.getOffersByBuyer(buyerId);
    res.status(200).json(offers);
  } catch (error) {
    console.error('Error getting offers by buyer:', error);
    res.status(500).json({ message: 'Failed to retrieve offers', error: (error as Error).message });
  }
};
