import { Router } from 'express';
import {
  getMineralListings,
  getMineralListingById,
  createMineralListing,
  updateMineralListing,
  deleteMineralListing,
  createMineralOffer,
  updateMineralOfferStatus,
  getOffersForListing,
  getOffersByBuyer,
} from '../controllers/marketplaceController'; // Removed .ts
import { authenticate, authorize } from '../middleware/authMiddleware'; // Removed .ts
import { UserRole } from '../interfaces/user'; // Removed .ts

const router = Router();

// Public routes (anyone can view listings)
router.get('/', getMineralListings);
router.get('/:id', getMineralListingById);

// Authenticated routes
router.use(authenticate); // Apply authentication to all routes below this point

// Seller/Admin routes
router.post('/listings', authorize(UserRole.SELLER, UserRole.ADMIN), createMineralListing);
router.put('/listings/:id', authorize(UserRole.SELLER, UserRole.ADMIN), updateMineralListing);
router.delete('/listings/:id', authorize(UserRole.SELLER, UserRole.ADMIN), deleteMineralListing);

// Offer routes
router.post('/offers', authorize(UserRole.BUYER), createMineralOffer); // Only buyers can create offers
router.put('/offers/:id/status', authorize(UserRole.SELLER, UserRole.ADMIN), updateMineralOfferStatus); // Sellers/Admins update offer status
router.get('/listings/:id/offers', authorize(UserRole.SELLER, UserRole.ADMIN), getOffersForListing); // View offers for a listing (seller/admin)
router.get('/offers/my-offers', authorize(UserRole.BUYER), getOffersByBuyer); // View offers made by current buyer


export const marketplaceRoutes = router;
