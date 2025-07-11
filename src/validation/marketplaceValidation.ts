import Joi from 'joi';

// Schema for creating a new mineral listing
export const createListingSchema = Joi.object({
  // seller_id is derived from the JWT, not from the request body, so it's not in the schema here.
  // It will be added by the controller before calling the service.

  mineralType: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Mineral type cannot be empty.',
      'string.min': 'Mineral type must be at least 2 characters long.',
      'string.max': 'Mineral type cannot exceed 100 characters.',
      'any.required': 'Mineral type is required.'
    }),

  quantity: Joi.number()
    .positive()
    .precision(8) // Allows up to 8 decimal places
    .required()
    .messages({
      'number.base': 'Quantity must be a number.',
      'number.positive': 'Quantity must be a positive number.',
      'number.precision': 'Quantity can have at most 8 decimal places.',
      'any.required': 'Quantity is required.'
    }),

  unit: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Unit cannot be empty.',
      'string.min': 'Unit must be at least 1 character long.',
      'string.max': 'Unit cannot exceed 50 characters.',
      'any.required': 'Unit is required.'
    }),

  pricePerUnit: Joi.number()
    .positive()
    .precision(8) // Allows up to 8 decimal places
    .required()
    .messages({
      'number.base': 'Price per unit must be a number.',
      'number.positive': 'Price per unit must be a positive number.',
      'number.precision': 'Price per unit can have at most 8 decimal places.',
      'any.required': 'Price per unit is required.'
    }),

  currency: Joi.string()
    .length(3) // e.g., USD, EUR, GBP
    .uppercase()
    .required()
    .messages({
      'string.empty': 'Currency cannot be empty.',
      'string.length': 'Currency must be 3 characters long (e.g., USD).',
      'string.uppercase': 'Currency must be in uppercase.',
      'any.required': 'Currency is required.'
    }),

  description: Joi.string()
    .max(1000)
    .allow('') // Allow empty string
    .optional()
    .messages({
      'string.max': 'Description cannot exceed 1000 characters.'
    }),

  location: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Location cannot be empty.',
      'string.min': 'Location must be at least 3 characters long.',
      'string.max': 'Location cannot exceed 200 characters.',
      'any.required': 'Location is required.'
    }),

  status: Joi.string()
    .valid('available', 'pending', 'sold', 'canceled')
    .default('available') // Set a default if not provided
    .optional()
    .messages({
      'any.only': 'Status must be one of "available", "pending", "sold", "canceled".'
    }),

  images: Joi.array()
    .items(Joi.string().uri()) // Each item must be a string URI
    .optional()
    .messages({
      'array.base': 'Images must be an array.',
      'array.items': 'Each image URL must be a valid URI.'
    })
});

// Schema for updating a mineral listing (all fields optional)
export const updateListingSchema = Joi.object({
  mineralType: Joi.string().min(2).max(100).optional(),
  quantity: Joi.number().positive().precision(8).optional(),
  unit: Joi.string().min(1).max(50).optional(),
  pricePerUnit: Joi.number().positive().precision(8).optional(),
  currency: Joi.string().length(3).uppercase().optional(),
  description: Joi.string().max(1000).allow('').optional(),
  location: Joi.string().min(3).max(200).optional(),
  status: Joi.string().valid('available', 'pending', 'sold', 'canceled').optional(),
  images: Joi.array().items(Joi.string().uri()).optional()
}).min(1) // At least one field must be provided for update
  .messages({
    'object.min': 'At least one field must be provided for update.'
  });


// Schema for creating a new mineral offer
export const createOfferSchema = Joi.object({
  listing_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.base': 'Listing ID must be a number.',
      'number.integer': 'Listing ID must be an integer.',
      'number.positive': 'Listing ID must be a positive number.',
      'any.required': 'Listing ID is required.'
    }),

  // buyer_id is derived from the JWT, not from the request body
  offer_price: Joi.number()
    .positive()
    .precision(8)
    .required()
    .messages({
      'number.base': 'Offer price must be a number.',
      'number.positive': 'Offer price must be a positive number.',
      'number.precision': 'Offer price can have at most 8 decimal places.',
      'any.required': 'Offer price is required.'
    }),

  currency: Joi.string()
    .length(3)
    .uppercase()
    .required()
    .messages({
      'string.empty': 'Currency cannot be empty.',
      'string.length': 'Currency must be 3 characters long (e.g., USD).',
      'string.uppercase': 'Currency must be in uppercase.',
      'any.required': 'Currency is required.'
    }),

  offer_quantity: Joi.number()
    .positive()
    .precision(8)
    .required()
    .messages({
      'number.base': 'Offer quantity must be a number.',
      'number.positive': 'Offer quantity must be a positive number.',
      'number.precision': 'Offer quantity can have at most 8 decimal places.',
      'any.required': 'Offer quantity is required.'
    }),

  status: Joi.string()
    .valid('pending', 'accepted', 'rejected', 'expired')
    .default('pending')
    .optional()
    .messages({
      'any.only': 'Status must be one of "pending", "accepted", "rejected", "expired".'
    }),

  message: Joi.string()
    .max(500)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Message cannot exceed 500 characters.'
    }),

  expiry_date: Joi.date()
    .iso() // Ensures it's an ISO 8601 date string
    .min('now') // Date must be in the future
    .optional()
    .messages({
      'date.base': 'Expiry date must be a valid date.',
      'date.iso': 'Expiry date must be in ISO 8601 format (e.g., YYYY-MM-DDTHH:mm:ssZ).',
      'date.min': 'Expiry date must be in the future.'
    })
});

// Schema for updating offer status
export const updateOfferStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'accepted', 'rejected', 'expired', 'completed') // ADDED 'completed' here
    .required()
    .messages({
      'any.only': 'Status must be one of "pending", "accepted", "rejected", "expired", "completed".',
      'any.required': 'Status is required.'
    })
});


// Schema for creating a payment/transaction (used by paymentController)
export const createPaymentSchema = Joi.object({
  listing_id: Joi.number().integer().positive().required(),
  // buyer_id is from JWT
  seller_id: Joi.number().integer().positive().required(),
  offer_id: Joi.number().integer().positive().allow(null).optional(), // Can be null if direct purchase
  final_price: Joi.number().positive().precision(8).required(),
  final_quantity: Joi.number().positive().precision(8).required(),
  currency: Joi.string().length(3).uppercase().required(),
  mineralType: Joi.string().min(2).max(100).required() // Added for Stripe product name
});
