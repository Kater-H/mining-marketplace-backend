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
} from '../controllers/marketplaceController';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { UserRole } from '../interfaces/user'; // Imports the type correctly

const router = Router();

// Public routes (anyone can view listings)
router.get('/', getMineralListings);
router.get('/:id', getMineralListingById);

// Authenticated routes
router.use(authenticate); // Apply authentication to all routes below this point

// Seller/Admin routes - Use string literals directly
router.post('/listings', authorize('seller', 'admin'), createMineralListing); // CHANGED: Used string literals
router.put('/listings/:id', authorize('seller', 'admin'), updateMineralListing); // CHANGED: Used string literals
router.delete('/listings/:id', authorize('seller', 'admin'), deleteMineralListing); // CHANGED: Used string literals

// Offer routes
router.post('/offers', authorize('buyer'), createMineralOffer); // CHANGED: Used string literal
router.put('/offers/:id/status', authorize('seller', 'admin'), updateMineralOfferStatus); // CHANGED: Used string literals
router.get('/listings/:id/offers', authorize('seller', 'admin'), getOffersForListing); // CHANGED: Used string literals
router.get('/offers/my-offers', authorize('buyer'), getOffersByBuyer); // CHANGED: Used string literal


export const marketplaceRoutes = router;
