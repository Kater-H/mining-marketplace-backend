// src/routes/listingRoutes.ts
import { Router } from 'express';
// Placeholder imports - replace with actual controllers and middleware later
import { getAllListings, getListingById, createListing, updateListing, deleteListing, getListingsBySeller } from '../controllers/marketplaceController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeMiddleware.js';


const router = Router();

// Public routes
router.get('/', getAllListings);
router.get('/:id', getListingById);

// Authenticated routes
router.use(authenticate);

// Seller/Admin routes
router.post('/', authorizeRoles(['miner', 'admin']), createListing);
router.put('/:id', authorizeRoles(['miner', 'admin']), updateListing);
router.delete('/:id', authorizeRoles(['miner', 'admin']), deleteListing);
router.get('/my-listings/seller', authorizeRoles(['miner', 'admin']), getListingsBySeller);


// Export the router as a named export
export const listingRoutes = router;
