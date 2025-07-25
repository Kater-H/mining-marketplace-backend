// src/routes/listingRoutes.ts
import { Router } from 'express';
// ... other imports for listingController functions, middleware, etc. ...
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

const router = Router();

// Public routes (no authentication needed to view all listings or a single listing)
router.get('/', getAllListings);
router.get('/:id', getListingById);

// Authenticated routes
router.post('/', authenticate, authorizeRoles(['miner', 'admin']), createListing);
router.put('/:id', authenticate, authorizeRoles(['miner', 'admin']), updateListing);
router.delete('/:id', authenticate, authorizeRoles(['miner', 'admin']), deleteListing);

// Route to get listings by the authenticated seller
router.get('/my-listings', authenticate, authorizeRoles(['miner', 'admin']), getListingsBySeller);

// Export the router as a named export
export { router }; // <--- THIS LINE IS CRUCIAL AND MUST BE PRESENT
