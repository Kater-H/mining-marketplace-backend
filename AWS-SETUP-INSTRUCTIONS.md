# AWS Setup Instructions for Mining Marketplace Backend Deployment

## Prerequisites Setup

Before running the deployment, you need to set up your AWS environment. Follow these steps:

### 1. Install AWS CLI

**On macOS:**
```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**On Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**On Windows:**
Download and run the AWS CLI MSI installer from: https://awscli.amazonaws.com/AWSCLIV2.msi

### 2. Install Docker

**On macOS:**
Download Docker Desktop from: https://www.docker.com/products/docker-desktop

**On Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**On Windows:**
Download Docker Desktop from: https://www.docker.com/products/docker-desktop

### 3. Create AWS Account and Configure Credentials

1. **Create AWS Account**: Go to https://aws.amazon.com and create an account
2. **Create IAM User**: 
   - Go to IAM console
   - Create a new user with programmatic access
   - Attach the following policies:
     - `AmazonECS_FullAccess`
     - `AmazonEC2ContainerRegistryFullAccess`
     - `AmazonRDS_FullAccess`
     - `CloudFormationFullAccess`
     - `IAMFullAccess`
     - `AmazonVPCFullAccess`
     - `ElasticLoadBalancingFullAccess`

3. **Configure AWS CLI**:
```bash
aws configure
```
Enter your:
- AWS Access Key ID
- AWS Secret Access Key  
- Default region (recommend: us-east-1)
- Default output format (recommend: json)

### 4. Verify Setup

Test your AWS configuration:
```bash
aws sts get-caller-identity
```

This should return your AWS account information.

## Deployment Process

### Option 1: Automated Deployment (Recommended)

Run the automated deployment script:
```bash
./deploy-aws.sh
```

This script will:
1. ✅ Check all prerequisites
2. ✅ Deploy infrastructure using CloudFormation
3. ✅ Build and push Docker image to ECR
4. ✅ Set up PostgreSQL database
5. ✅ Deploy application to ECS
6. ✅ Configure load balancer and health checks

### Option 2: Manual Step-by-Step Deployment

If you prefer to run each step manually:

#### Step 1: Deploy Infrastructure
```bash
aws cloudformation create-stack \
    --stack-name mining-marketplace-production-infrastructure \
    --template-body file://aws/infrastructure.yml \
    --parameters ParameterKey=ProjectName,ParameterValue=mining-marketplace \
                ParameterKey=Environment,ParameterValue=production \
                ParameterKey=DatabasePassword,ParameterValue="YourSecurePassword123!" \
    --capabilities CAPABILITY_NAMED_IAM \
    --region us-east-1
```

#### Step 2: Wait for Infrastructure
```bash
aws cloudformation wait stack-create-complete \
    --stack-name mining-marketplace-production-infrastructure \
    --region us-east-1
```

#### Step 3: Get ECR Repository URI
```bash
ECR_URI=$(aws cloudformation describe-stacks \
    --stack-name mining-marketplace-production-infrastructure \
    --region us-east-1 \
    --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
    --output text)
```

#### Step 4: Build and Push Docker Image
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URI

# Build image
docker build -t mining-marketplace-backend .

# Tag and push
docker tag mining-marketplace-backend:latest $ECR_URI:latest
docker push $ECR_URI:latest
```

#### Step 5: Deploy ECS Service
```bash
# Register task definition (update with actual values first)
aws ecs register-task-definition --cli-input-json file://aws/task-definition-updated.json

# Create ECS service
aws ecs create-service --cli-input-json file://aws/service-definition-updated.json
```

## Expected Costs

**Monthly AWS costs for this setup (approximate):**
- ECS Fargate (2 tasks): ~$30-50
- RDS PostgreSQL (db.t3.micro): ~$15-20
- Application Load Balancer: ~$20
- Data transfer: ~$5-10
- **Total: ~$70-100/month**

## Security Considerations

1. **Database Password**: Change the default password in the CloudFormation parameters
2. **JWT Secret**: Update the JWT secret in the task definition
3. **Payment Keys**: Add your actual Stripe/Flutterwave keys
4. **VPC Security**: The setup uses private subnets for the database
5. **HTTPS**: Consider adding SSL certificate for production use

## Monitoring and Logs

- **Application Logs**: Available in CloudWatch under `/ecs/mining-marketplace-production`
- **Health Checks**: Available at `http://your-alb-dns/health`
- **Database Monitoring**: Available in RDS console
- **Container Insights**: Enabled for ECS cluster monitoring

## Troubleshooting

**Common Issues:**
1. **Permission Denied**: Ensure your IAM user has all required permissions
2. **Docker Build Fails**: Check Dockerfile and ensure all dependencies are available
3. **Service Won't Start**: Check CloudWatch logs for container errors
4. **Database Connection**: Verify security groups allow ECS to connect to RDS

**Getting Help:**
- Check CloudWatch logs for detailed error messages
- Use `aws ecs describe-services` to check service status
- Use `aws cloudformation describe-stack-events` to see infrastructure deployment issues

## Next Steps After Deployment

1. **Test the API**: Use the provided health check endpoint
2. **Set up monitoring**: Configure CloudWatch alarms
3. **Add SSL certificate**: Use AWS Certificate Manager
4. **Set up CI/CD**: Integrate with GitHub Actions for automated deployments
5. **Configure custom domain**: Use Route 53 for custom domain setup

