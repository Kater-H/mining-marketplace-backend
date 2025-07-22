// src/controllers/listingController.ts
import { Request, Response, NextFunction } from 'express';
import { ListingService, Listing } from '../services/listingService.js'; // <-- Added Listing interface import
import { ApplicationError } from '../utils/applicationError.js';
import Joi from 'joi';

const listingService = new ListingService();

// Joi schema for listing creation validation - uses camelCase as received from frontend
const createListingSchema = Joi.object({
  mineralType: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().min(10).max(1000).required(),
  quantity: Joi.number().positive().precision(4).required(),
  unit: Joi.string().trim().max(10).required(),
  pricePerUnit: Joi.number().positive().precision(4).required(),
  currency: Joi.string().length(3).uppercase().required(),
  location: Joi.string().trim().max(100).required(),
});

// Joi schema for listing update validation - uses camelCase as received from frontend
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

    // Map camelCase from Joi validation result to snake_case for the database/service
    const listingData: Listing = { // Explicitly type as Listing
      seller_id: sellerId,
      mineral_type: value.mineralType,
      description: value.description,
      quantity: value.quantity,
      unit: value.unit,
      price_per_unit: value.pricePerUnit,
      currency: value.currency,
      location: value.location,
      // status will default in DB or can be explicitly set if needed
    };

    const listing = await listingService.createListing(listingData);
    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};

// Get all mineral listings (publicly accessible)
export const getAllListings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Implement filtering and pagination if needed
    const listings = await listingService.getAllListings();
    res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};

// Get a single mineral listing by ID (publicly accessible)
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

    // Map camelCase from Joi validation result to snake_case for the database/service
    const updatedData: Partial<Listing> = {}; // Explicitly type as Partial<Listing>
    if (value.mineralType !== undefined) updatedData.mineral_type = value.mineralType;
    if (value.description !== undefined) updatedData.description = value.description;
    if (value.quantity !== undefined) updatedData.quantity = value.quantity;
    if (value.unit !== undefined) updatedData.unit = value.unit;
    if (value.pricePerUnit !== undefined) updatedData.price_per_unit = value.pricePerUnit;
    if (value.currency !== undefined) updatedData.currency = value.currency;
    if (value.location !== undefined) updatedData.location = value.location;
    if (value.status !== undefined) updatedData.status = value.status;

    const updatedListing = await listingService.updateListing(listingId, sellerId, updatedData);
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
    throw new ApplicationError('Failed to delete listing.', 500, error as Error);
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
