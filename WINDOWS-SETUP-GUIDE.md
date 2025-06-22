# Complete AWS Setup Guide for Windows Beginners
## Mining Marketplace Backend Deployment

### 🎯 Overview
This guide will take you from zero to having your Mining Marketplace backend running on AWS. We'll do everything step by step, and I'll explain what each step does.

**What we're building:**
- A professional backend API running on Amazon Web Services
- A PostgreSQL database to store your data
- A public URL that stakeholders can access
- Monitoring and logging for production use

**Estimated time:** 45-60 minutes

---

## STEP 1: Create Your AWS Account (10 minutes)

### 1.1 Sign Up for AWS
1. **Go to AWS website**: Open your browser and visit https://aws.amazon.com
2. **Click "Create an AWS Account"** (orange button in top right)
3. **Enter your information:**
   - Email address (use a professional email if possible)
   - Password (make it strong!)
   - AWS account name (e.g., "YourName-MiningMarketplace")

### 1.2 Verify Your Identity
1. **Phone verification**: AWS will call or text you with a verification code
2. **Enter the code** when prompted
3. **Choose support plan**: Select "Basic support - Free" (this is fine for now)

### 1.3 Add Payment Method
⚠️ **Important**: AWS requires a credit card, but we'll set up billing alerts so you won't get surprised charges.

1. **Add your credit card information**
2. **Verify your card** (AWS may charge $1 temporarily to verify)

### 1.4 Set Up Billing Alerts (IMPORTANT!)
1. **Go to AWS Console**: After account creation, you'll be in the AWS Management Console
2. **Click your name** in the top right corner
3. **Select "Billing and Cost Management"**
4. **Click "Billing preferences"** in the left sidebar
5. **Check the box** for "Receive Billing Alerts"
6. **Click "Save preferences"**

Now let's create an alert:
1. **Go to CloudWatch** (search for it in the AWS search bar)
2. **Click "Alarms"** in the left sidebar
3. **Click "Create alarm"**
4. **Select "Billing"** as the metric
5. **Set threshold to $10** (this will alert you if costs exceed $10)
6. **Enter your email** for notifications
7. **Click "Create alarm"**

✅ **You now have an AWS account with cost protection!**

---

## STEP 2: Install Required Tools (15 minutes)

### 2.1 Install AWS CLI
The AWS CLI lets us control AWS from the command line.

1. **Download AWS CLI**: Go to https://awscli.amazonaws.com/AWSCLIV2.msi
2. **Run the installer**: Double-click the downloaded file
3. **Follow the installation wizard**: Keep clicking "Next" with default settings
4. **Restart Git Bash**: Close and reopen Git Bash

**Test the installation:**
```bash
aws --version
```
You should see something like: `aws-cli/2.x.x Python/3.x.x Windows/10`

### 2.2 Install Docker Desktop
Docker lets us package our application into containers.

1. **Download Docker Desktop**: Go to https://www.docker.com/products/docker-desktop/
2. **Click "Download for Windows"**
3. **Run the installer**: Double-click the downloaded file
4. **Follow the installation wizard**:
   - ✅ Check "Use WSL 2 instead of Hyper-V"
   - ✅ Check "Add shortcut to desktop"
5. **Restart your computer** when prompted

**After restart:**
1. **Start Docker Desktop**: Double-click the desktop icon
2. **Accept the license agreement**
3. **Wait for Docker to start** (you'll see a whale icon in your system tray)

**Test Docker in Git Bash:**
```bash
docker --version
```
You should see something like: `Docker version 20.x.x`

✅ **You now have all the required tools installed!**

---

## STEP 3: Set Up AWS Security (15 minutes)

### 3.1 Create an IAM User
Instead of using your main AWS account, we'll create a special user for deployments.

1. **Go to AWS Console**: https://console.aws.amazon.com
2. **Search for "IAM"** in the search bar and click it
3. **Click "Users"** in the left sidebar
4. **Click "Create user"**

**User details:**
- **User name**: `mining-marketplace-deployer`
- **Select "Provide user access to the AWS Management Console"**: ❌ Leave unchecked
- **Click "Next"**

### 3.2 Set Permissions
1. **Select "Attach policies directly"**
2. **Search and select these policies** (check the box next to each):
   - `AmazonECS_FullAccess`
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonRDS_FullAccess`
   - `CloudFormationFullAccess`
   - `IAMFullAccess`
   - `AmazonVPCFullAccess`
   - `ElasticLoadBalancingFullAccess`

3. **Click "Next"**
4. **Review and click "Create user"**

### 3.3 Create Access Keys
1. **Click on your new user** (`mining-marketplace-deployer`)
2. **Click the "Security credentials" tab**
3. **Scroll down to "Access keys"**
4. **Click "Create access key"**
5. **Select "Command Line Interface (CLI)"**
6. **Check the confirmation box**
7. **Click "Next"**
8. **Add description**: "Mining Marketplace Deployment"
9. **Click "Create access key"**

**⚠️ IMPORTANT**: Copy both the Access Key ID and Secret Access Key somewhere safe. You'll need them in the next step!

✅ **You now have secure AWS credentials!**

---

## STEP 4: Configure AWS CLI (5 minutes)

Now we'll connect your computer to your AWS account.

1. **Open Git Bash**
2. **Run the configuration command:**
```bash
aws configure
```

3. **Enter your information when prompted:**
   - **AWS Access Key ID**: Paste the Access Key ID from Step 3.3
   - **AWS Secret Access Key**: Paste the Secret Access Key from Step 3.3
   - **Default region name**: Type `us-east-1`
   - **Default output format**: Type `json`

**Test your configuration:**
```bash
aws sts get-caller-identity
```

You should see something like:
```json
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/mining-marketplace-deployer"
}
```

✅ **Your computer is now connected to AWS!**

---

## STEP 5: Deploy Your Application (10 minutes)

Now for the exciting part - let's deploy your Mining Marketplace backend!

### 5.1 Navigate to Your Project
```bash
cd /path/to/your/mining-marketplace/backend
```

### 5.2 Run the Deployment Script
```bash
./deploy-aws.sh
```

**What this script does:**
1. ✅ Checks that everything is set up correctly
2. ✅ Creates all the AWS infrastructure (VPC, database, load balancer, etc.)
3. ✅ Builds your application into a Docker container
4. ✅ Uploads the container to AWS
5. ✅ Starts your application on AWS servers
6. ✅ Sets up monitoring and health checks

**Expected output:**
```
[2024-01-20 10:30:15] Starting AWS deployment for Mining Marketplace Backend
[2024-01-20 10:30:16] Checking prerequisites...
[SUCCESS] Prerequisites check completed
[2024-01-20 10:30:17] Deploying infrastructure with CloudFormation...
```

**This will take about 10-15 minutes.** The script will show you progress updates.

### 5.3 Deployment Complete!
When finished, you'll see:
```
[SUCCESS] Deployment completed successfully!
Application URL: http://mining-marketplace-production-alb-1234567890.us-east-1.elb.amazonaws.com
Health Check: http://mining-marketplace-production-alb-1234567890.us-east-1.elb.amazonaws.com/health
```

✅ **Your application is now live on the internet!**

---

## STEP 6: Test Your Deployment (5 minutes)

### 6.1 Test the Health Check
Copy the Health Check URL from the deployment output and paste it into your browser.

You should see something like:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T15:30:45.123Z",
  "uptime": 123.45,
  "environment": "production",
  "version": "1.0.0"
}
```

### 6.2 Test the API
Try accessing your API endpoints:
- `http://your-url/api/users` - User management
- `http://your-url/api/marketplace` - Marketplace features
- `http://your-url/api/payment` - Payment processing

✅ **Your Mining Marketplace backend is now running on AWS!**

---

## 🎉 Congratulations!

You've successfully deployed a production-ready backend to AWS! Here's what you now have:

### ✅ What's Running
- **Professional API**: Your backend is running on enterprise-grade AWS infrastructure
- **Database**: PostgreSQL database storing your data securely
- **Load Balancer**: Distributes traffic and provides high availability
- **Monitoring**: CloudWatch logs and metrics tracking your application
- **Security**: Proper network isolation and access controls

### 💰 Cost Information
- **Expected monthly cost**: $70-100
- **What you're paying for**: 
  - Application hosting (ECS Fargate)
  - Database hosting (RDS PostgreSQL)
  - Load balancer
  - Data transfer

### 📊 Monitoring Your Application
1. **Go to AWS Console**: https://console.aws.amazon.com
2. **Search for "CloudWatch"**
3. **Click "Log groups"** to see your application logs
4. **Click "Dashboards"** to see performance metrics

### 🔗 Sharing with Stakeholders
Your application is now accessible at the URL provided in the deployment output. You can share this URL with stakeholders to demonstrate your Mining Marketplace backend.

### 🚀 Next Steps
1. **Custom Domain**: Set up a custom domain name (optional)
2. **SSL Certificate**: Add HTTPS for security (recommended for production)
3. **CI/CD Pipeline**: Automate deployments when you update your code
4. **Scaling**: Configure auto-scaling for high traffic

---

## 🆘 Troubleshooting

### Common Issues and Solutions

**"aws: command not found"**
- Solution: Restart Git Bash after installing AWS CLI

**"docker: command not found"**
- Solution: Make sure Docker Desktop is running (check system tray)

**"Permission denied" errors**
- Solution: Make sure your IAM user has all the required policies

**Deployment script fails**
- Solution: Check the error message and ensure all prerequisites are met

**Can't access the application URL**
- Solution: Wait 5-10 minutes after deployment for everything to start up

### Getting Help
If you run into any issues:
1. Check the error message carefully
2. Look at the CloudWatch logs in AWS Console
3. Make sure all prerequisites are installed correctly
4. Verify your AWS credentials are configured properly

---

## 📞 Support
If you need help with any of these steps, just let me know! I can help troubleshoot specific issues or explain any part in more detail.

