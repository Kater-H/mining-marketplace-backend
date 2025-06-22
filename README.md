# Mining Marketplace Backend

A comprehensive Node.js/TypeScript backend API for a mining marketplace platform, featuring user authentication, marketplace operations, and payment processing.

## 🚀 Features

- **User Management**: Registration, authentication, email verification, role-based access
- **Marketplace Operations**: Mineral listing creation, search, and management
- **Payment Processing**: Stripe and Flutterwave integration for secure transactions
- **Database**: PostgreSQL with proper relationships and constraints
- **Security**: JWT authentication, input validation, SQL injection protection
- **Testing**: Comprehensive unit and integration tests (100% pass rate)
- **CI/CD**: GitHub Actions pipeline with automated testing
- **Containerization**: Docker support for consistent deployments
- **AWS Deployment**: Production-ready CloudFormation infrastructure

## 📋 Prerequisites

- Node.js 20.x or higher
- PostgreSQL 13+ 
- Docker (for containerized deployment)
- AWS CLI (for cloud deployment)

## 🛠️ Installation

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/mining-marketplace-backend.git
cd mining-marketplace-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.ci.template .env
# Edit .env with your actual values
```

4. **Set up database**
```bash
# Create PostgreSQL database
createdb mining_marketplace

# Run migrations (if you have them)
npm run db:migrate
```

5. **Start development server**
```bash
npm run dev
```

The API will be available at `http://localhost:8080`

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test Types
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Tests with coverage
npm run test:coverage
```

### Test Results
- **Unit Tests**: 314/314 passing (100%)
- **Integration Tests**: 100% pass rate for critical flows
- **Coverage**: ~88% overall coverage

## 🐳 Docker Deployment

### Build Docker Image
```bash
docker build -t mining-marketplace-backend .
```

### Run with Docker
```bash
docker run -p 8080:8080 \
  -e DATABASE_URL="your_database_url" \
  -e JWT_SECRET="your_jwt_secret" \
  mining-marketplace-backend
```

## ☁️ AWS Deployment

### Prerequisites
- AWS CLI installed and configured
- Docker installed
- AWS account with appropriate permissions

### Automated Deployment
```bash
# Run the automated deployment script
./deploy-aws.sh
```

This will:
- Create all AWS infrastructure (VPC, RDS, ECS, ALB)
- Build and push Docker image to ECR
- Deploy application to ECS Fargate
- Set up monitoring and logging

### Manual Deployment
See `AWS-SETUP-INSTRUCTIONS.md` for detailed manual deployment steps.

## 📊 API Endpoints

### Authentication
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `POST /api/users/verify-email` - Email verification
- `GET /api/users/profile` - Get user profile

### Marketplace
- `GET /api/marketplace/listings` - Get all listings
- `POST /api/marketplace/listings` - Create new listing
- `GET /api/marketplace/listings/:id` - Get specific listing
- `PUT /api/marketplace/listings/:id` - Update listing
- `DELETE /api/marketplace/listings/:id` - Delete listing

### Payments
- `POST /api/payment/stripe/create` - Create Stripe payment intent
- `POST /api/payment/flutterwave/create` - Create Flutterwave payment
- `GET /api/payment/transactions` - Get user transactions
- `GET /api/payment/transactions/:id` - Get specific transaction

### Health Check
- `GET /health` - Application health status
- `GET /ready` - Readiness check
- `GET /alive` - Liveness check

## 🏗️ Architecture

### Project Structure
```
src/
├── controllers/          # Request handlers
├── services/            # Business logic
├── models/              # Data models and database interactions
├── routes/              # API route definitions
├── middleware/          # Custom middleware (auth, validation)
├── config/              # Configuration files
├── interfaces/          # TypeScript interfaces
└── __tests__/           # Test files
    ├── unit/            # Unit tests
    └── integration/     # Integration tests

aws/                     # AWS deployment configurations
docs/                    # Documentation
.github/workflows/       # CI/CD pipelines
```

### Technology Stack
- **Runtime**: Node.js 20.x
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Payment**: Stripe, Flutterwave
- **Testing**: Jest, Supertest
- **Containerization**: Docker
- **Cloud**: AWS (ECS, RDS, ALB, ECR)
- **CI/CD**: GitHub Actions

## 🔧 Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mining_marketplace

# Authentication
JWT_SECRET=your_jwt_secret_key

# Payment Providers
STRIPE_SECRET_KEY=sk_test_your_stripe_key
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-your_key
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your_key
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TEST-your_encryption_key

# Application
NODE_ENV=development
PORT=8080
```

## 📈 Monitoring

### Health Checks
- **Health**: `GET /health` - Overall application health
- **Ready**: `GET /ready` - Ready to receive traffic
- **Alive**: `GET /alive` - Application is running

### Logging
- Application logs available in CloudWatch (AWS deployment)
- Local logs output to console in development
- Structured logging with timestamps and levels

### Metrics
- Response times and error rates
- Database connection health
- Payment processing success rates
- User registration and authentication metrics

## 🔒 Security

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (admin, miner, buyer, verifier)
- Email verification required
- Password hashing with bcrypt

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting (recommended for production)

### Infrastructure Security
- Private database subnets
- Security groups with minimal access
- IAM roles with least privilege
- Encrypted data at rest (RDS)

## 🚀 Deployment Environments

### Development
- Local PostgreSQL database
- Hot reloading with ts-node
- Detailed error messages
- Test payment keys

### Production (AWS)
- RDS PostgreSQL (Multi-AZ for HA)
- ECS Fargate (auto-scaling)
- Application Load Balancer
- CloudWatch monitoring
- Production payment keys

## 📚 Documentation

- `AWS-SETUP-INSTRUCTIONS.md` - Complete AWS deployment guide
- `WINDOWS-SETUP-GUIDE.md` - Windows-specific setup instructions
- `docs/CI-CD-Pipeline-Documentation.md` - CI/CD pipeline details
- API documentation available via health endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Update documentation as needed
- Follow the existing code style
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

### Common Issues
- **Database connection errors**: Check DATABASE_URL and PostgreSQL service
- **Authentication failures**: Verify JWT_SECRET configuration
- **Payment errors**: Confirm payment provider keys and webhook setup
- **Docker build issues**: Ensure all dependencies are available

### Getting Help
1. Check the documentation in the `docs/` folder
2. Review CloudWatch logs for AWS deployments
3. Check GitHub Issues for known problems
4. Contact the development team

## 🎯 Roadmap

### Upcoming Features
- [ ] Real-time notifications
- [ ] Advanced search and filtering
- [ ] File upload for mineral samples
- [ ] Multi-language support
- [ ] Mobile API optimizations
- [ ] Advanced analytics dashboard

### Infrastructure Improvements
- [ ] Auto-scaling policies
- [ ] Blue-green deployments
- [ ] Database read replicas
- [ ] CDN integration
- [ ] Advanced monitoring and alerting

---

**Built with ❤️ for the mining industry**

