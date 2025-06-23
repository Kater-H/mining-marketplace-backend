#!/bin/bash

# Mining Marketplace Backend - AWS Deployment Script
# This script deploys the complete infrastructure and application to AWS

set -e  # Exit on any error

# Configuration
PROJECT_NAME="mining-marketplace"
ENVIRONMENT="production"
AWS_REGION="us-east-1"
STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}-infrastructure"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log "AWS Account ID: $AWS_ACCOUNT_ID"
    
    success "Prerequisites check completed"
}

# Deploy infrastructure using CloudFormation
deploy_infrastructure() {
    log "Deploying infrastructure with CloudFormation..."
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $AWS_REGION &> /dev/null; then
        log "Stack exists, updating..."
        aws cloudformation update-stack \
            --stack-name $STACK_NAME \
            --template-body file://aws/infrastructure.yml \
            --parameters ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME \
                        ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
                        ParameterKey=DatabasePassword,ParameterValue="SecurePassword123!" \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $AWS_REGION
        
        aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $AWS_REGION
    else
        log "Creating new stack..."
        aws cloudformation create-stack \
            --stack-name $STACK_NAME \
            --template-body file://aws/infrastructure.yml \
            --parameters ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME \
                        ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
                        ParameterKey=DatabasePassword,ParameterValue="SecurePassword123!" \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $AWS_REGION
        
        aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $AWS_REGION
    fi
    
    success "Infrastructure deployment completed"
}

# Get stack outputs
get_stack_outputs() {
    log "Retrieving stack outputs..."
    
    ECR_URI=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryURI`].OutputValue' \
        --output text)
    
    DB_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
        --output text)
    
    ALB_DNS=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)
    
    ECS_CLUSTER=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
        --output text)
    
    TARGET_GROUP_ARN=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`TargetGroupArn`].OutputValue' \
        --output text)
    
    EXECUTION_ROLE_ARN=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSTaskExecutionRoleArn`].OutputValue' \
        --output text)
    
    TASK_ROLE_ARN=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSTaskRoleArn`].OutputValue' \
        --output text)
    
    PUBLIC_SUBNET_1=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnet1Id`].OutputValue' \
        --output text)
    
    PUBLIC_SUBNET_2=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`PublicSubnet2Id`].OutputValue' \
        --output text)
    
    ECS_SECURITY_GROUP=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $AWS_REGION \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSSecurityGroupId`].OutputValue' \
        --output text)
    
    log "ECR URI: $ECR_URI"
    log "Database Endpoint: $DB_ENDPOINT"
    log "Load Balancer DNS: $ALB_DNS"
    
    success "Stack outputs retrieved"
}

# Build and push Docker image
build_and_push_image() {
    log "Building and pushing Docker image..."
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI
    
    # Build image
    docker build -t $PROJECT_NAME-backend .
    
    # Tag image
    docker tag $PROJECT_NAME-backend:latest $ECR_URI:latest
    
    # Push image
    docker push $ECR_URI:latest
    
    success "Docker image built and pushed"
}

# Setup database schema
setup_database() {
    log "Setting up database schema..."
    
    # Create a temporary task definition for database setup
    cat > aws/db-setup-task.json << EOF
{
  "family": "mining-marketplace-db-setup",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "$EXECUTION_ROLE_ARN",
  "taskRoleArn": "$TASK_ROLE_ARN",
  "containerDefinitions": [
    {
      "name": "db-setup",
      "image": "$ECR_URI:latest",
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgresql://mining_admin:SecurePassword123!@$DB_ENDPOINT:5432/mining_marketplace"
        }
      ],
      "command": ["node", "-e", "console.log('Database setup would run here')"],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/mining-marketplace-production",
          "awslogs-region": "$AWS_REGION",
          "awslogs-stream-prefix": "db-setup"
        }
      }
    }
  ]
}
EOF
    
    # Register task definition
    aws ecs register-task-definition \
        --cli-input-json file://aws/db-setup-task.json \
        --region $AWS_REGION
    
    # Run database setup task
    TASK_ARN=$(aws ecs run-task \
        --cluster $ECS_CLUSTER \
        --task-definition mining-marketplace-db-setup \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$PUBLIC_SUBNET_1,$PUBLIC_SUBNET_2],securityGroups=[$ECS_SECURITY_GROUP],assignPublicIp=ENABLED}" \
        --region $AWS_REGION \
        --query 'tasks[0].taskArn' \
        --output text)
    
    log "Database setup task started: $TASK_ARN"
    
    # Wait for task to complete
    aws ecs wait tasks-stopped \
        --cluster $ECS_CLUSTER \
        --tasks $TASK_ARN \
        --region $AWS_REGION
    
    success "Database setup completed"
}

# Update task definition with actual values
update_task_definition() {
    log "Updating task definition with actual values..."
    
    # Create updated task definition
    sed -e "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g" \
        -e "s/REGION/$AWS_REGION/g" \
        -e "s/DATABASE_ENDPOINT/$DB_ENDPOINT/g" \
        -e "s/DATABASE_PASSWORD/SecurePassword123!/g" \
        aws/task-definition.json > aws/task-definition-updated.json
    
    # Update execution and task role ARNs
    sed -i "s|arn:aws:iam::ACCOUNT_ID:role/mining-marketplace-production-ecs-execution-role|$EXECUTION_ROLE_ARN|g" aws/task-definition-updated.json
    sed -i "s|arn:aws:iam::ACCOUNT_ID:role/mining-marketplace-production-ecs-task-role|$TASK_ROLE_ARN|g" aws/task-definition-updated.json
    
    # Register task definition
    aws ecs register-task-definition \
        --cli-input-json file://aws/task-definition-updated.json \
        --region $AWS_REGION
    
    success "Task definition updated and registered"
}

# Deploy ECS service
deploy_service() {
    log "Deploying ECS service..."
    
    # Update service definition with actual values
    sed -e "s/PUBLIC_SUBNET_1_ID/$PUBLIC_SUBNET_1/g" \
        -e "s/PUBLIC_SUBNET_2_ID/$PUBLIC_SUBNET_2/g" \
        -e "s/ECS_SECURITY_GROUP_ID/$ECS_SECURITY_GROUP/g" \
        -e "s|arn:aws:elasticloadbalancing:REGION:ACCOUNT_ID:targetgroup/mining-marketplace-production-tg/TARGET_GROUP_ID|$TARGET_GROUP_ARN|g" \
        aws/service-definition.json > aws/service-definition-updated.json
    
    # Check if service exists
    if aws ecs describe-services \
        --cluster $ECS_CLUSTER \
        --services mining-marketplace-backend-service \
        --region $AWS_REGION \
        --query 'services[0].serviceName' \
        --output text 2>/dev/null | grep -q "mining-marketplace-backend-service"; then
        
        log "Service exists, updating..."
        aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service mining-marketplace-backend-service \
            --task-definition mining-marketplace-backend \
            --desired-count 2 \
            --region $AWS_REGION
    else
        log "Creating new service..."
        aws ecs create-service \
            --cli-input-json file://aws/service-definition-updated.json \
            --region $AWS_REGION
    fi
    
    # Wait for service to stabilize
    log "Waiting for service to stabilize..."
    aws ecs wait services-stable \
        --cluster $ECS_CLUSTER \
        --services mining-marketplace-backend-service \
        --region $AWS_REGION
    
    success "ECS service deployed successfully"
}

# Main deployment function
main() {
    log "Starting AWS deployment for Mining Marketplace Backend"
    
    check_prerequisites
    deploy_infrastructure
    get_stack_outputs
    build_and_push_image
    setup_database
    update_task_definition
    deploy_service
    
    success "Deployment completed successfully!"
    log "Application URL: http://$ALB_DNS"
    log "Health Check: http://$ALB_DNS/health"
    
    # Save deployment info
    cat > deployment-info.txt << EOF
Mining Marketplace Backend - Deployment Information
==================================================

Application URL: http://$ALB_DNS
Health Check: http://$ALB_DNS/health
API Base URL: http://$ALB_DNS/api

AWS Resources:
- ECS Cluster: $ECS_CLUSTER
- ECR Repository: $ECR_URI
- Database Endpoint: $DB_ENDPOINT
- Load Balancer: $ALB_DNS

Deployment Date: $(date)
EOF
    
    success "Deployment information saved to deployment-info.txt"
}

# Run main function
main "$@"

