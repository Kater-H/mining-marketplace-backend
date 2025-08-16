// src/routes/marketplaceRoutes.ts
import { Router } from 'express';
// Import all controller functions
import {
  createListing,
  getAllListings,
  getListingById,
  updateListing,
  deleteListing,
  getListingsBySeller,
} from '../controllers/listingController.js'; 
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeMiddleware.js';
import { router as offerRoutes } from './offerRoutes.js'; // Ensure this is imported for nesting

const router = Router();

// Public routes (no authentication needed to view listings)
// This will handle GET /api/marketplace/listings
router.get('/listings', getAllListings);
// This will handle GET /api/marketplace/listings/:id
router.get('/listings/:id', getListingById);


// Authenticated routes
router.use(authenticate); // All routes below this will require authentication

// Mount offerRoutes under /offers within marketplaceRoutes
// This creates paths like /api/marketplace/offers/my-offers, which aligns with your logs.
router.use('/offers', offerRoutes); 

// Seller-specific routes (only 'miner' and 'admin' roles can manage listings)
router.post('/listings', authorizeRoles(['miner', 'admin']), createListing);
router.put('/listings/:id', authorizeRoles(['miner', 'admin']), updateListing);
router.delete('/listings/:id', authorizeRoles(['miner', 'admin']), deleteListing);

// Get listings by the authenticated seller (miner/admin)
router.get('/my-listings/seller', authorizeRoles(['miner', 'admin']), getListingsBySeller);

// Export the router as a named export directly
export { router };
