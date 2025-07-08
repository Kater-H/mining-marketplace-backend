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

// Get all mineral listings
export const getMineralListings = async (req: Request, res: Response): Promise<void> => {
  try {
    // DEBUG LOG ADDED HERE
    console.log('DEBUG: getMineralListings - Version 4.0 Active');
    console.log('🔍 getMineralListings: Incoming req.query:', req.query);

    const filterSchema = Joi.object({
        // Frontend likely sends camelCase, so validate for camelCase
        mineralType: Joi.string().optional(),
        location: Joi.string().optional(),
        status: Joi.string().valid('available', 'pending', 'sold', 'canceled').optional(),
        minPrice: Joi.number().min(0).optional(), // Assuming frontend sends minPrice
        maxPrice: Joi.number().min(0).optional(), // Assuming frontend sends maxPrice
        sortBy: Joi.string().valid('created_at', 'price_per_unit', 'quantity').optional(), // Frontend may send sortBy, but service expects snake_case for column names
        sortDirection: Joi.string().valid('asc', 'desc').optional(), // Frontend may send sortDirection
        limit: Joi.number().integer().min(1).optional(),
        page: Joi.number().integer().min(1).optional()
    }).unknown(true); // Allow unknown keys to avoid validation errors for unexpected params

    // Validate the query parameters
    const { error, value: validatedQueryParams } = filterSchema.validate(req.query);

    if (error) {
        console.error('❌ getMineralListings: Joi validation error:', error.details);
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

    console.log('🔍 getMineralListings: Filters passed to service:', filters);

    // Pass the transformed filters to the service
    const listings = await marketplaceService.getMineralListings(filters);
    res.status(200).json(listings);
  } catch (error) {
    console.error('❌ Error getting mineral listings:', error);
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
      res.status(404).json({ message: 'Mineral listing not found or not authorized to delete' });
    }
  } catch (error) {
    console.error('Error deleting mineral listing:', error);
    // Handle specific foreign key constraint error more gracefully
    if ((error as any).code === '23503') {
      res.status(409).json({
        message: 'Failed to delete listing due to existing related transactions or offers.',
        error: (error as any).detail || 'Foreign key constraint violation.'
      });
    } else {
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
    const userRoles = (req as any).user.roles;

    if (!userRoles.includes('seller') && !userRoles.includes('admin')) {
      res.status(403).json({ message: 'Forbidden: Only sellers or admins can update offer status' });
      return;
    }

    const updatedOffer = await marketplaceService.updateOfferStatus(offerId, status);
    res.status(200).json({ message: 'Offer status updated successfully', offer: updatedOffer });
  } catch (error) {
    console.error('Error updating offer status:', error);
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
