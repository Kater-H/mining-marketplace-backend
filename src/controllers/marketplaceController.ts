import { Request, Response } from 'express';
import { MarketplaceService } from '../services/marketplaceService'; // Removed .ts
import { UserService } from '../services/userService'; // Removed .ts
import { UserRole } from '../interfaces/user'; // Removed .ts

const marketplaceService = new MarketplaceService();
const userService = new UserService();

// Get all mineral listings
export const getMineralListings = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters = req.query; // Query params are the filters
    const listings = await marketplaceService.getMineralListings(filters);
    res.status(200).json(listings);
  } catch (error) {
    console.error('Error getting mineral listings:', error);
    res.status(500).json({ message: 'Failed to retrieve mineral listings', error: (error as Error).message });
  }
};

// Get mineral listing by ID
export const getMineralListingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const listingId = parseInt(req.params.id);
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
    // User is attached by the authenticate middleware
    const userId = (req as any).user.id;
    const userRole = (req as any).user.roles[0]; // Assuming roles is an array, take the first one
    console.log('User Role:', userRole);

    // Basic role check
    if (userRole !== UserRole.SELLER && userRole !== UserRole.ADMIN) {
      res.status(403).json({ message: 'Forbidden: Only sellers or admins can create listings' });
      return;
    }

    const listingData = { ...req.body, user_id: userId };
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
    const userId = (req as any).user.id;
    const userRoles = (req as any).user.roles;

    const listing = await marketplaceService.getMineralListingById(listingId);
    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    // Check if user is the owner or an admin
    const isOwner = listing.user_id === userId;
    const isAdmin = userRoles.includes(UserRole.ADMIN);

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Forbidden: You can only update your own listings or be an admin' });
      return;
    }

    const updatedListing = await marketplaceService.updateMineralListing(listingId, req.body, userId);
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
    const userId = (req as any).user.id;
    const userRoles = (req as any).user.roles;

    const listing = await marketplaceService.getMineralListingById(listingId);
    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    // Check if user is the owner or an admin
    const isOwner = listing.user_id === userId;
    const isAdmin = userRoles.includes(UserRole.ADMIN);

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Forbidden: You can only delete your own listings or be an admin' });
      return;
    }

    const success = await marketplaceService.deleteMineralListing(listingId, userId);
    if (success) {
      res.status(204).send(); // No content for successful deletion
    } else {
      res.status(404).json({ message: 'Mineral listing not found or not authorized to delete' });
    }
  } catch (error) {
    console.error('Error deleting mineral listing:', error);
    res.status(500).json({ message: 'Failed to delete mineral listing', error: (error as Error).message });
  }
};

// Create a mineral offer
export const createMineralOffer = async (req: Request, res: Response): Promise<void> => {
  try {
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
    const { status } = req.body;
    const userRoles = (req as any).user.roles;

    // Check if user is seller or admin
    if (!userRoles.includes(UserRole.SELLER) && !userRoles.includes(UserRole.ADMIN)) {
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
    const userId = (req as any).user.id;
    const userRoles = (req as any).user.roles;

    const listing = await marketplaceService.getMineralListingById(listingId);
    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    const isOwner = listing.user_id === userId;
    const isAdmin = userRoles.includes(UserRole.ADMIN);

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
    const buyerId = parseInt(req.params.id); // Or (req as any).user.id if always current user
    const userId = (req as any).user.id;
    const userRoles = (req as any).user.roles;

    // A user can only view their own offers unless they are an admin
    const isOwner = buyerId === userId;
    const isAdmin = userRoles.includes(UserRole.ADMIN);

    if (!isOwner && !isAdmin) {
      res.status(403).json({ message: 'Forbidden: You can only view your own offers or as an admin' });
      return;
    }

    const offers = await marketplaceService.getOffersByBuyer(buyerId);
    res.status(200).json(offers);
  } catch (error) {
    console.error('Error getting offers by buyer:', error);
    res.status(500).json({ message: 'Failed to retrieve offers', error: (error as Error).message });
  }
};
