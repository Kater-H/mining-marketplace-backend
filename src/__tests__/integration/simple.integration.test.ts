import request from 'supertest';
import express from 'express';

// Create a very simple Express app for testing
const createSimpleApp = () => {
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  
  // Simple test route
  app.get('/test', (req, res) => {
    res.json({ message: 'Test route working' });
  });
  
  // Simple registration route for testing
  app.post('/api/users/register', (req, res) => {
    console.log('Registration endpoint hit with body:', req.body);
    
    try {
      const { email, password, role, first_name, last_name } = req.body;
      
      // Basic validation
      if (!email || !password || !role) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Mock successful response
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: 1,
          email,
          firstName: first_name,
          lastName: last_name,
          role,
          isVerified: false
        },
        verificationToken: 'mock-token'
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  return app;
};

describe('Simple Integration Test', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createSimpleApp();
  });

  test('should respond to test route', async () => {
    const response = await request(app)
      .get('/test');
    
    console.log('Test route response:', response.status, response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Test route working');
  });

  test('should handle registration with mock data', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      first_name: 'John',
      last_name: 'Doe',
      role: 'buyer'
    };

    const response = await request(app)
      .post('/api/users/register')
      .send(userData);
    
    console.log('Registration response:', response.status, response.body);
    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(userData.email);
  });
});

