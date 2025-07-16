// src/routes/marketplaceRoutes.ts
import { Router } from 'express';
// Corrected imports from listingController.js (which is your marketplaceController)
import {
  createListing,
  getAllListings,
  getListingById,
  updateListing,
  deleteListing,
  getListingsBySeller,
} from '../controllers/listingController.js'; // Corrected to listingController.js
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
export const marketplaceRoutes = router; // Export as marketplaceRoutes
