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
} from '../controllers/marketplaceController.js'; // Ensure .js is here
import { authenticate, authorize } from '../middleware/authMiddleware.js'; // Ensure .js is here
import { UserRole } from '../interfaces/user.js'; // Ensure .js is here

const router = Router();

// Public routes (anyone can view listings)
router.get('/', getMineralListings);
router.get('/:id', getMineralListingById);

// Authenticated routes
router.use(authenticate); // Apply authentication to all routes below this point

// Seller/Admin routes
router.post('/listings', authorize('seller', 'admin'), createMineralListing);
router.put('/listings/:id', authorize('seller', 'admin'), updateMineralListing);
router.delete('/listings/:id', authorize('seller', 'admin'), deleteMineralListing);

// Offer routes
router.post('/offers', authorize('buyer'), createMineralOffer);
router.put('/offers/:id/status', authorize('seller', 'admin'), updateMineralOfferStatus);
router.get('/listings/:id/offers', authorize('seller', 'admin'), getOffersForListing);
router.get('/offers/my-offers', authorize('buyer'), getOffersByBuyer);

// CHANGED: Export the router as a default export
export default router;
