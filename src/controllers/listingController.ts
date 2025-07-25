// src/controllers/listingController.ts
import { Request, Response, NextFunction } from 'express';
import { ListingService } from '../services/listingService.js';
import { ApplicationError } from '../utils/applicationError.js';
import Joi from 'joi';
// Import BackendListing and input types from the model, which is the source of truth
import { BackendListing, CreateListingInput, UpdateListingInput } from '../models/listingModel.js';

const listingService = new ListingService();

// Joi schema for creating a new listing
const createListingSchema = Joi.object({
  mineralType: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().min(10).max(1000).required(),
  quantity: Joi.number().min(0.01).required(),
  unit: Joi.string().trim().required(),
  pricePerUnit: Joi.number().min(0.01).required(),
  currency: Joi.string().trim().length(3).uppercase().required(),
  location: Joi.string().trim().min(3).max(100).required(),
});

// Joi schema for updating an existing listing
const updateListingSchema = Joi.object({
  mineralType: Joi.string().trim().min(3).max(100).optional(),
  description: Joi.string().trim().min(10).max(1000).optional(),
  quantity: Joi.number().min(0.01).optional(),
  unit: Joi.string().trim().optional(),
  pricePerUnit: Joi.number().min(0.01).optional(),
  currency: Joi.string().trim().length(3).uppercase().optional(),
  location: Joi.string().trim().min(3).max(100).optional(),
  status: Joi.string().valid('available', 'pending', 'sold', 'canceled').optional(),
});

/**
 * Creates a new mineral listing.
 * Requires authentication and 'miner' or 'admin' role.
 */
export const createListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApplicationError('User not authenticated.', 401);
    }

    const { error, value } = createListingSchema.validate(req.body);
    if (error) {
      throw new ApplicationError(error.details[0].message, 400);
    }

    const listingData: CreateListingInput = {
      seller_id: req.user.id, // Seller ID from authenticated user
      mineral_type: value.mineralType,
      description: value.description,
      quantity: value.quantity,
      unit: value.unit,
      price_per_unit: value.pricePerUnit,
      currency: value.currency,
      location: value.location,
      status: 'available', // Default status for new listings
    };

    const newListing = await listingService.createListing(listingData);

    // Map BackendListing to Frontend Listing for response
    const frontendListing = {
      id: newListing.id,
      seller_id: newListing.seller_id,
      mineral_type: newListing.mineral_type,
      description: newListing.description,
      quantity: newListing.quantity,
      unit: newListing.unit,
      price_per_unit: newListing.price_per_unit,
      currency: newListing.currency,
      location: newListing.location,
      status: newListing.status,
      // Ensure created_at/updated_at are Date objects before calling toISOString()
      listed_date: newListing.created_at instanceof Date ? newListing.created_at.toISOString() : newListing.created_at,
      last_updated: newListing.updated_at instanceof Date ? newListing.updated_at.toISOString() : newListing.updated_at,
      created_at: newListing.created_at instanceof Date ? newListing.created_at.toISOString() : newListing.created_at,
      updated_at: newListing.updated_at instanceof Date ? newListing.updated_at.toISOString() : newListing.updated_at,
      // Seller details are not available on creation, will be fetched on display
    };

    res.status(201).json({ message: 'Listing created successfully!', listing: frontendListing });
  } catch (error) {
    next(error);
  }
};

/**
 * Gets all mineral listings with seller details.
 */
export const getAllListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listings = await listingService.getAllListingsWithSellerDetails(); // Correct method call
    // Map BackendListing (with joined seller data) to Frontend Listing for response
    const frontendListings = listings.map((listing: BackendListing) => ({ // Explicitly type 'listing'
      id: listing.id,
      seller_id: listing.seller_id,
      mineral_type: listing.mineral_type,
      description: listing.description,
      quantity: listing.quantity,
      unit: listing.unit,
      price_per_unit: listing.price_per_unit,
      currency: listing.currency,
      location: listing.location,
      status: listing.status,
      listed_date: listing.created_at instanceof Date ? listing.created_at.toISOString() : listing.created_at,
      last_updated: listing.updated_at instanceof Date ? listing.updated_at.toISOString() : listing.updated_at,
      created_at: listing.created_at instanceof Date ? listing.created_at.toISOString() : listing.created_at,
      updated_at: listing.updated_at instanceof Date ? listing.updated_at.toISOString() : listing.updated_at,
      seller_company_name: listing.seller_company_name, // Include joined data
      seller_location: listing.seller_location,         // Include joined data
      seller_compliance_status: listing.seller_compliance_status, // Include joined data
    }));
    res.status(200).json(frontendListings);
  } catch (error) {
    next(error);
  }
};

/**
 * Gets a single mineral listing by ID with seller details.
 */
export const getListingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId)) {
      throw new ApplicationError('Invalid listing ID provided.', 400);
    }

    const listing = await listingService.getListingByIdWithSellerDetails(listingId); // Correct method call
    if (!listing) {
      throw new ApplicationError('Listing not found.', 404);
    }

    // Map BackendListing (with joined seller data) to Frontend Listing for response
    const frontendListing = {
      id: listing.id,
      seller_id: listing.seller_id,
      mineral_type: listing.mineral_type,
      description: listing.description,
      quantity: listing.quantity,
      unit: listing.unit,
      price_per_unit: listing.price_per_unit,
      currency: listing.currency,
      location: listing.location,
      status: listing.status,
      listed_date: listing.created_at instanceof Date ? listing.created_at.toISOString() : listing.created_at,
      last_updated: listing.updated_at instanceof Date ? listing.updated_at.toISOString() : listing.updated_at,
      created_at: listing.created_at instanceof Date ? listing.created_at.toISOString() : listing.created_at,
      updated_at: listing.updated_at instanceof Date ? listing.updated_at.toISOString() : listing.updated_at,
      seller_company_name: listing.seller_company_name, // Include joined data
      seller_location: listing.seller_location,         // Include joined data
      seller_compliance_status: listing.seller_compliance_status, // Include joined data
    };

    res.status(200).json(frontendListing);
  } catch (error) {
    next(error);
  }
};

/**
 * Gets all mineral listings for a specific seller.
 * Requires authentication.
 */
export const getListingsBySeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApplicationError('User not authenticated.', 401);
    }
    const sellerId = req.user.id; // Get listings for the authenticated user

    const listings = await listingService.getListingsBySellerId(sellerId); // Correct method call

    const frontendListings = listings.map((listing: BackendListing) => ({ // Explicitly type 'listing'
      id: listing.id,
      seller_id: listing.seller_id,
      mineral_type: listing.mineral_type,
      description: listing.description,
      quantity: listing.quantity,
      unit: listing.unit,
      price_per_unit: listing.price_per_unit,
      currency: listing.currency,
      location: listing.location,
      status: listing.status,
      listed_date: listing.created_at instanceof Date ? listing.created_at.toISOString() : listing.created_at,
      last_updated: listing.updated_at instanceof Date ? listing.updated_at.toISOString() : listing.updated_at,
      created_at: listing.created_at instanceof Date ? listing.created_at.toISOString() : listing.created_at,
      updated_at: listing.updated_at instanceof Date ? listing.updated_at.toISOString() : listing.updated_at,
      seller_company_name: listing.seller_company_name,
      seller_location: listing.seller_location,
      seller_compliance_status: listing.seller_compliance_status,
    }));
    res.status(200).json(frontendListings);
  } catch (error) {
    next(error);
  }
};


/**
 * Updates an existing mineral listing.
 * Requires authentication and ownership or 'admin' role.
 */
export const updateListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApplicationError('User not authenticated.', 401);
    }

    const listingId = parseInt(req.params.id);
    if (isNaN(listingId)) {
      throw new ApplicationError('Invalid listing ID provided.', 400);
    }

    const { error, value } = updateListingSchema.validate(req.body);
    if (error) {
      throw new ApplicationError(error.details[0].message, 400);
    }

    // Ensure only the owner or an admin can update
    const existingListing = await listingService.getListingById(listingId); // Get without seller details for auth check
    if (!existingListing) {
      throw new ApplicationError('Listing not found.', 404);
    }
    if (existingListing.seller_id !== req.user.id && req.user.role !== 'admin') {
      throw new ApplicationError('Unauthorized: You can only update your own listings.', 403);
    }

    const updatedListing = await listingService.updateListing(listingId, value);

    // Map BackendListing to Frontend Listing for response (seller details not needed here)
    const frontendListing = {
      id: updatedListing.id,
      seller_id: updatedListing.seller_id,
      mineral_type: updatedListing.mineral_type,
      description: updatedListing.description,
      quantity: updatedListing.quantity,
      unit: updatedListing.unit,
      price_per_unit: updatedListing.price_per_unit,
      currency: updatedListing.currency,
      location: updatedListing.location,
      status: updatedListing.status,
      listed_date: updatedListing.created_at instanceof Date ? updatedListing.created_at.toISOString() : updatedListing.created_at,
      last_updated: updatedListing.updated_at instanceof Date ? updatedListing.updated_at.toISOString() : updatedListing.updated_at,
      created_at: updatedListing.created_at instanceof Date ? updatedListing.created_at.toISOString() : updatedListing.created_at,
      updated_at: updatedListing.updated_at instanceof Date ? updatedListing.updated_at.toISOString() : updatedListing.updated_at,
    };

    res.status(200).json({ message: 'Listing updated successfully!', listing: frontendListing });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a mineral listing.
 * Requires authentication and ownership or 'admin' role.
 */
export const deleteListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApplicationError('User not authenticated.', 401);
    }

    const listingId = parseInt(req.params.id);
    if (isNaN(listingId)) {
      throw new ApplicationError('Invalid listing ID provided.', 400);
    }

    // Ensure only the owner or an admin can delete
    const existingListing = await listingService.getListingById(listingId);
    if (!existingListing) {
      throw new ApplicationError('Listing not found.', 404);
    }
    if (existingListing.seller_id !== req.user.id && req.user.role !== 'admin') {
      throw new ApplicationError('Unauthorized: You can only delete your own listings.', 403);
    }

    await listingService.deleteListing(listingId);
    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    next(error);
  }
};
