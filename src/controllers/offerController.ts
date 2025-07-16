// src/controllers/offerController.ts
import { Request, Response, NextFunction } from 'express';
import { OfferService } from '../services/offerService.js'; // Ensure .js extension
import { ApplicationError } from '../utils/applicationError.js';
import Joi from 'joi';

const offerService = new OfferService();

// Joi schema for offer creation validation
const createOfferSchema = Joi.object({
  listing_id: Joi.number().integer().positive().required(),
  offer_price: Joi.number().positive().precision(4).required(),
  offer_quantity: Joi.number().positive().precision(4).required(),
  message: Joi.string().trim().max(500).optional().allow(''),
  currency: Joi.string().length(3).uppercase().required(), // Ensure currency is included
});

// Joi schema for offer status update validation
const updateOfferStatusSchema = Joi.object({
  status: Joi.string().valid('accepted', 'rejected', 'expired', 'completed').required(),
});

// Create a new offer
export const createOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createOfferSchema.validate(req.body);
    if (error) {
      throw new ApplicationError(error.details[0].message, 400);
    }

    const buyerId = req.user!.id; // Get buyer ID from authenticated user
    const offer = await offerService.createOffer({ ...value, buyer_id: buyerId });
    res.status(201).json(offer);
  } catch (error) {
    next(error);
  }
};

// Get offers for a specific listing (for sellers)
export const getOffersByListing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const listingId = parseInt(req.params.listingId);
    if (isNaN(listingId)) {
      throw new ApplicationError('Invalid listing ID.', 400);
    }

    const sellerId = req.user!.id; // Get seller ID from authenticated user
    const offers = await offerService.getOffersByListing(listingId, sellerId);
    res.status(200).json(offers);
  } catch (error) {
    next(error);
  }
};

// Get offers made by a specific buyer
export const getOffersByBuyer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const buyerId = req.user!.id; // Get buyer ID from authenticated user
    const offers = await offerService.getOffersByBuyer(buyerId);
    res.status(200).json(offers);
  } catch (error) {
    next(error);
  }
};

// Update offer status (for sellers)
export const updateOfferStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offerId = parseInt(req.params.id);
    if (isNaN(offerId)) {
      throw new ApplicationError('Invalid offer ID.', 400);
    }

    const { error, value } = updateOfferStatusSchema.validate(req.body);
    if (error) {
      throw new ApplicationError(error.details[0].message, 400);
    }

    const sellerId = req.user!.id; // Get seller ID from authenticated user
    const updatedOffer = await offerService.updateOfferStatus(offerId, sellerId, value.status);
    res.status(200).json(updatedOffer);
  } catch (error) {
    next(error);
  }
};

// Get a single offer by ID
export const getOfferById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const offerId = parseInt(req.params.id);
    if (isNaN(offerId)) {
      throw new ApplicationError('Invalid offer ID.', 400);
    }
    const offer = await offerService.getOfferById(offerId);
    if (!offer) {
      throw new ApplicationError('Offer not found.', 404);
    }
    res.status(200).json(offer);
  } catch (error) {
    next(error);
  }
};
