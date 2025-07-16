// src/routes/offerRoutes.ts
import { Router } from 'express';
// Placeholder imports - replace with actual controllers and middleware later
import { createOffer, getOffersByListing, getOffersByBuyer, updateOfferStatus, getOfferById } from '../controllers/offerController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/authorizeMiddleware.js';


const router = Router();

// Authenticated routes
router.use(authenticate);

// Buyer/Admin routes
router.post('/', authorizeRoles(['buyer', 'admin']), createOffer);
router.get('/my-offers', authorizeRoles(['buyer', 'admin']), getOffersByBuyer);

// Seller/Admin routes
router.put('/:id/status', authorizeRoles(['miner', 'admin']), updateOfferStatus);
router.get('/listing/:listingId', authorizeRoles(['miner', 'admin']), getOffersByListing);
router.get('/:id', authorizeRoles(['buyer', 'miner', 'admin']), getOfferById);


// Export the router as a named export
export const offerRoutes = router;
