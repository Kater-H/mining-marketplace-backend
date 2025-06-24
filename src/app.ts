// @ts-nocheck

import express from 'express';

import cors from 'cors';

import morgan from 'morgan';

import * as path from 'path';

import { healthRoutes } from './src/routes/healthRoutes';

import { marketplaceRoutes } from './src/routes/marketplaceRoutes';

import userRoutes from './src/routes/userRoutes';

import { paymentRoutes } from './src/routes/paymentRoutes';

import { config } from './src/config/config';



// Create Express app

const app = express();



// Add mock authenticator for tests

if (process.env.NODE_ENV === 'test') {

  console.log('Setting up mock authenticator for tests');

  config.authenticator = {

    validateApiKey: () => true

  };

}



// Middleware

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(morgan('dev'));



// Static files

app.use(express.static(path.join(__dirname, 'public')));



// Routes

app.use('/api/health', healthRoutes);

app.use('/api/minerals', marketplaceRoutes);

app.use('/api/users', userRoutes);

app.use('/api/payments', paymentRoutes);



// Default route

app.get('/', (req: express.Request, res: express.Response) => {

  res.json({

    message: 'Mining Marketplace API',

    version: '1.0.0',

    endpoints: [

      '/api/health',

      '/api/minerals',

      '/api/users',

      '/api/payments'

    ]

  });

});



// Error handling middleware

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {

  console.error('Global error handler:', err);

  

  const statusCode = err.statusCode || 500;

  const message = err.message || 'Internal Server Error';

  

  res.status(statusCode).json({

    error: message,

    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined

  });

});



// 404 handler

app.use((req: express.Request, res: express.Response) => {

  res.status(404).json({

    error: 'Not Found',

    message: `Route ${req.method} ${req.url} not found`

  });

});



export { app };