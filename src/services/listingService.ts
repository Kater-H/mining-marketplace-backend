// src/services/listingService.ts
import { ListingModel, BackendListing, CreateListingInput, UpdateListingInput } from '../models/listingModel.js'; // Import types and Model from the new file
import { ApplicationError } from '../utils/applicationError.js';

const listingModel = new ListingModel();

export class ListingService {
  /**
   * Creates a new listing.
   * @param data - The listing data.
   * @returns The created listing.
   */
  async createListing(data: CreateListingInput): Promise<BackendListing> {
    return listingModel.createListing(data);
  }

  /**
   * Gets a listing by ID (internal use, no seller details).
   * @param id - The listing ID.
   * @returns The listing.
   */
  async getListingById(id: number): Promise<BackendListing | null> {
    return listingModel.getListingById(id);
  }

  /**
   * Gets all listings with joined seller details.
   * @returns An array of listings.
   */
  async getAllListingsWithSellerDetails(): Promise<BackendListing[]> {
    return listingModel.getAllListingsWithSellerDetails();
  }

  /**
   * Gets a single listing by ID with joined seller details.
   * @param id - The listing ID.
   * @returns The listing.
   */
  async getListingByIdWithSellerDetails(id: number): Promise<BackendListing | null> {
    return listingModel.getListingByIdWithSellerDetails(id);
  }

  /**
   * Gets all listings by a specific seller ID with seller details.
   * @param sellerId - The ID of the seller.
   * @returns An array of listings.
   */
  async getListingsBySellerId(sellerId: number): Promise<BackendListing[]> {
    return listingModel.getListingsBySellerId(sellerId);
  }

  /**
   * Updates an existing listing.
   * @param id - The listing ID.
   * @param updates - Fields to update.
   * @returns The updated listing.
   */
  async updateListing(id: number, updates: UpdateListingInput): Promise<BackendListing> {
    const updatedListing = await listingModel.updateListing(id, updates);
    if (!updatedListing) {
      throw new ApplicationError('Listing not found or could not be updated.', 404);
    }
    return updatedListing;
  }

  /**
   * Deletes a listing.
   * @param id - The listing ID.
   */
  async deleteListing(id: number): Promise<void> {
    await listingModel.deleteListing(id);
  }
}
