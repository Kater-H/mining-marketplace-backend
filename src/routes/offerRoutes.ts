// src/routes/offerRoutes.ts
import { Router } from 'express';
// Import all specific functions from offerController.js
import {
  createOffer,
  getOffersByListing,
  getOffersByBuyer,
  updateOfferStatus,
  getOfferById,
} from '../controllers/offerController.js'; // Corrected import path/name
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeMiddleware.js'; // This path must be correct!

const router = Router();

// Authenticated routes
router.use(authenticate); // All routes below this will require authentication

// Buyer can create offers
router.post('/', authorizeRoles(['buyer', 'admin']), createOffer);

// Seller/Admin can view offers for their listings
router.get('/listing/:listingId', authorizeRoles(['miner', 'admin']), getOffersByListing);

// Buyer/Admin can view their own offers
router.get('/my-offers', authorizeRoles(['buyer', 'admin']), getOffersByBuyer);

// Seller/Admin can update offer status
router.put('/:id/status', authorizeRoles(['miner', 'admin']), updateOfferStatus);

// Get a specific offer by ID (optional, but good for detail views)
router.get('/:id', authorizeRoles(['buyer', 'miner', 'admin']), getOfferById);

// Export the router as a named export directly
export { router }; // <--- CHANGED: Export 'router' as a named export
