import * as express from 'express';

import { authorize } from '../middleware/authMiddleware.ts';
import { 

  createMineralListing, 

  getMineralListings, 

  getMineralListingById,

  updateMineralListing,

  deleteMineralListing,

  addPhotoToListing

} from '../controllers/marketplaceController.ts';



const router = express.Router();



// Get all mineral listings

router.get('/', getMineralListings);



// Get a specific mineral listing

router.get('/:id', getMineralListingById);



// Create a new mineral listing
router.post('/', authorize('miner', 'admin'), createMineralListing);

// Update a mineral listing
router.put('/:id', authorize('miner', 'admin'), updateMineralListing);

// Delete a mineral listing
router.delete('/:id', authorize('miner', 'admin'), deleteMineralListing);

// Add photo to listing
router.post('/:listing_id/photos', authorize('miner', 'admin'), addPhotoToListing);



export { router as marketplaceRoutes };