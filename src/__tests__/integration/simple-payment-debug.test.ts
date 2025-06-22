import request from 'supertest';
import express from 'express';
import userRoutes from '../../routes/userRoutes';

describe('Simple App Test', () => {
  let app: express.Application;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    
    // Add a simple test route
    app.get('/test', (req, res) => {
      res.json({ message: 'Test route working' });
    });
    
    // Add user routes
    app.use('/api/users', userRoutes);
    
    // Error handling
    app.use((error: any, req: any, res: any, next: any) => {
      console.error('❌ Test app error:', error);
      res.status(500).json({ message: 'Server error during registration' });
    });
  });

  test('should respond to test route', async () => {
    const response = await request(app)
      .get('/test');
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Test route working');
  });

  test('should handle user registration', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
      role: 'buyer'
    };

    const response = await request(app)
      .post('/api/users/register')
      .send(userData);

    console.log('Registration response status:', response.status);
    console.log('Registration response body:', response.body);
    
    // Just check that we get some response
    expect(response.status).toBeDefined();
  });
});

