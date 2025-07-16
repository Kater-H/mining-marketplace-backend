// src/routes/listingRoutes.ts
import { Router } from 'express';
// Import all specific functions from listingController.js
import {
  createListing,
  getAllListings,
  getListingById,
  updateListing,
  deleteListing,
  getListingsBySeller,
} from '../controllers/marketplaceController.js'; // Corrected import path/name
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeMiddleware.js'; // This path must be correct!

const router = Router();

// Public routes (no authentication needed to view listings)
router.get('/', getAllListings);
router.get('/:id', getListingById);

// Authenticated routes
router.use(authenticate); // All routes below this will require authentication

// Seller-specific routes (only 'miner' and 'admin' roles can manage listings)
router.post('/', authorizeRoles(['miner', 'admin']), createListing);
router.put('/:id', authorizeRoles(['miner', 'admin']), updateListing);
router.delete('/:id', authorizeRoles(['miner', 'admin']), deleteListing);

// Get listings by the authenticated seller (miner/admin)
router.get('/my-listings/seller', authorizeRoles(['miner', 'admin']), getListingsBySeller);

// Export as a named export for app.ts
export const listingRoutes = router;
