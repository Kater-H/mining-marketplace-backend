// src/controllers/marketplaceController.ts
import { Request, Response, NextFunction } from 'express';
import { ListingService } from '../services/listingService.js'; // Ensure .js extension
import { ApplicationError } from '../utils/applicationError.js';
import Joi from 'joi';

const listingService = new ListingService();

// Joi schema for listing creation validation
const createListingSchema = Joi.object({
  mineralType: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().min(10).max(1000).required(),
  quantity: Joi.number().positive().precision(4).required(),
  unit: Joi.string().trim().max(10).required(),
  pricePerUnit: Joi.number().positive().precision(4).required(),
  currency: Joi.string().length(3).uppercase().required(),
  location: Joi.string().trim().max(100).required(),
});

// Joi schema for listing update validation
const updateListingSchema = Joi.object({
  mineralType: Joi.string().trim().min(3).max(100).optional(),
  description: Joi.string().trim().min(10).max(1000).optional(),
  quantity: Joi.number().positive().precision(4).optional(),
  unit: Joi.string().trim().max(10).optional(),
  pricePerUnit: Joi.number().positive().precision(4).optional(),
  currency: Joi.string().length(3).uppercase().optional(),
  location: Joi.string().trim().max(100).optional(),
  status: Joi.string().valid('available', 'pending', 'sold', 'canceled').optional(),
});

// Create a new mineral listing
export const createListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createListingSchema.validate(req.body);
    if (error) {
      throw new ApplicationError(error.details[0].message, 400);
    }

    const sellerId = req.user!.id; // Get seller ID from authenticated user
    const listing = await listingService.createListing({ ...value, seller_id: sellerId });
    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};

// Get all mineral listings with optional filters
export const getAllListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract query parameters for filtering
    const { mineralType, location, status, minPrice, maxPrice } = req.query;

    const filters = {
      mineralType: mineralType as string,
      location: location as string,
      status: status as 'available' | 'pending' | 'sold' | 'canceled',
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
    };

    const listings = await listingService.getAllListings(filters);
    res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};

// Get a single mineral listing by ID
export const getListingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId)) {
      throw new ApplicationError('Invalid listing ID.', 400);
    }

    const listing = await listingService.getListingById(listingId);
    if (!listing) {
      throw new ApplicationError('Listing not found.', 404);
    }
    res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
};

// Update a mineral listing
export const updateListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId)) {
      throw new ApplicationError('Invalid listing ID.', 400);
    }

    const { error, value } = updateListingSchema.validate(req.body);
    if (error) {
      throw new ApplicationError(error.details[0].message, 400);
    }

    const sellerId = req.user!.id; // Ensure only the owner or admin can update
    const updatedListing = await listingService.updateListing(listingId, sellerId, value);
    res.status(200).json(updatedListing);
  } catch (error) {
    next(error);
  }
};

// Delete a mineral listing
export const deleteListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId)) {
      throw new ApplicationError('Invalid listing ID.', 400);
    }

    const sellerId = req.user!.id; // Ensure only the owner or admin can delete
    await listingService.deleteListing(listingId, sellerId);
    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    next(error);
  }
};

// Get listings by authenticated seller
export const getListingsBySeller = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sellerId = req.user!.id; // Get seller ID from authenticated user
    const listings = await listingService.getListingsBySeller(sellerId);
    res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};
