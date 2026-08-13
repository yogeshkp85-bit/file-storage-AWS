# CloudVault: Click-by-Click AWS Setup Guide (Beginner Friendly)

Welcome! If you are new to AWS, this guide is designed for you. It explains exactly where to click, what to name your services, and how to verify your configurations. We will be using the **Europe (Stockholm) `eu-north-1`** region as seen in your AWS Console.

---

## Table of Contents
1. [Step 1: Create and Configure your Amazon S3 Bucket](#step-1-create-and-configure-your-amazon-s3-bucket)
2. [Step 2: Deploy your DynamoDB Table](#step-2-deploy-your-dynamodb-table)
3. [Step 3: Create the IAM Role for Lambda Functions](#step-3-create-the-iam-role-for-lambda-functions)
4. [Step 4: Deploy the Cleanup and Notification Lambda Functions](#step-4-deploy-the-cleanup-and-notification-lambda-functions)
5. [Step 5: Setup your Local Environment Variables](#step-5-setup-your-local-environment-variables)

---

## Step 1: Create and Configure your Amazon S3 Bucket

Amazon S3 (Simple Storage Service) is where CloudVault stores the actual physical files you upload.

### A. Create the Bucket
1. Look at your browser screen. Click the orange **Create bucket** button.
2. In **Bucket name**, enter a unique, lowercase name. For example: `cloudvault-storage-yourname-1308` (S3 bucket names must be globally unique).
3. In **AWS Region**, make sure **Europe (Stockholm) eu-north-1** is selected.
4. Leave **Object Ownership** as *ACLs disabled (recommended)*.
5. In **Block Public Access settings for this bucket**, make sure **Block all public access** is **checked** (checked is the default and is secure).
6. Scroll all the way to the bottom and click the orange **Create bucket** button.

### B. Configure CORS (Cross-Origin Resource Sharing)
Since our frontend application is running on your browser, AWS S3 needs permission to accept uploads directly from your frontend.
1. In the list of buckets, click on the name of your new bucket (e.g. `cloudvault-storage-yourname-1308`).
2. Click the **Permissions** tab at the top.
3. Scroll all the way to the bottom until you see **Cross-origin resource sharing (CORS)**. Click **Edit**.
4. Paste the following JSON block into the editor:
   ```json
   [
       {
           "AllowedHeaders": ["*"],
           "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
           "AllowedOrigins": ["*"],
           "ExposeHeaders": ["ETag"]
       }
   ]
   ```
5. Click **Save changes**.

### C. Enable Versioning (Highly Recommended)
S3 Versioning keeps a history of your files, so if you overwrite a file by accident, older versions can still be restored.
1. Scroll back to the top of your bucket and click the **Properties** tab.
2. Under **Bucket Versioning**, click **Edit**.
3. Select **Enable** and click **Save changes**.

---

## Step 2: Deploy your DynamoDB Table

DynamoDB is a fast NoSQL database. CloudVault uses it to store metadata (like file names, file sizes, upload timestamps, and who uploaded them).

### A. Navigate to DynamoDB
1. In the search bar at the top of the AWS Console, type `DynamoDB` and press enter or click the first search result.
2. Make sure your region at the top right is still **Europe (Stockholm)**.

### B. Create Table
1. Click the orange **Create table** button.
2. Enter the following details exactly:
   * **Table name:** `CloudVaultFiles`
   * **Partition key:** `user_id` (Type: **String**)
   * **Sort key:** `file_id` (Type: **String**)
3. Under **Table settings**, leave **Default settings** selected.
4. Click **Create table** at the bottom. It will take a few seconds to transition to the "Active" status.

---

## Step 3: Create the IAM Role for Lambda Functions

IAM (Identity and Access Management) defines permissions. Before we deploy our automated cleanup and notification scripts (Lambdas), we must create a "Role" that allows them to read/write to S3 and DynamoDB.

### A. Navigate to IAM
1. In the top search bar, search for `IAM` and open it.
2. In the left-hand navigation pane, click **Roles**, then click **Create role**.

### B. Configure Permissions
1. Under **Trusted entity type**, select **AWS service**.
2. Under **Service or use case**, select **Lambda** from the dropdown menu, then click **Next**.
3. In the **Permissions policies** search bar, search for and check the box next to the following policies:
   * `AWSLambdaBasicExecutionRole` (Allows writing logs to CloudWatch)
   * `AmazonS3FullAccess` (Allows deleting files from S3 during cleanup)
   * `AmazonDynamoDBFullAccess` (Allows querying and updating DynamoDB metadata)
   * `AmazonSNSFullAccess` (Allows publishing status emails)
4. Click **Next**.
5. **Role name:** Enter `CloudVaultLambdaRole`.
6. Click **Create role**.

---

## Step 4: Deploy the Cleanup and Notification Lambda Functions

AWS Lambda lets you run background tasks without managing a server.

### A. Create the Cleanup Lambda Function
1. Search for `Lambda` in the search bar and open the console.
2. Click **Create function**.
3. Choose **Author from scratch**.
4. **Function name:** `CloudVaultCleanup`
5. **Runtime:** Select **Python 3.9** (or a higher Python version).
6. Under **Change default execution role**, click the arrow to expand, then:
   * Select **Use an existing role**.
   * Choose the **CloudVaultLambdaRole** you created in Step 3.
7. Click **Create function**.
8. In the code editor on the page, clear the default code and paste the entire content of [cleanup_lambda.py](file:///d:/file-storage-AWS/backend/cleanup_lambda.py).
9. Click the **Deploy** button above the editor.

### B. Configure Cleanup Environment Variables
1. On the Lambda function page, click the **Configuration** tab.
2. In the left menu, select **Environment variables** and click **Edit**.
3. Add these variables:
   * Key: `DYNAMODB_TABLE_NAME` | Value: `CloudVaultFiles`
   * Key: `S3_BUCKET_NAME` | Value: `(Your S3 Bucket Name)`
4. Click **Save**.

### C. Create the Notifications Lambda Function
1. Go back to Lambda Functions and click **Create function**.
2. Name: `CloudVaultNotifications`
3. Runtime: **Python 3.9**
4. Execution role: **Use an existing role** -> Select **CloudVaultLambdaRole**.
5. Click **Create function**.
6. Paste the contents of [notifications.py](file:///d:/file-storage-AWS/backend/notifications.py) and click **Deploy**.

---

## Step 5: Setup your Local Environment Variables

To connect your local Next.js code to your new live AWS services:

1. Create a file in the root directory of this project called `.env.local`.
2. Populate it with your active keys:
   ```env
   AWS_REGION=eu-north-1
   AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
   S3_BUCKET_NAME=cloudvault-storage-divya-5678-600159355341-eu-north-1-an
   DYNAMODB_TABLE_NAME=CloudVaultFiles1
   ```
3. Restart your Next.js local server (`npm run dev`). Uploads and actions will now execute directly on your live AWS infrastructure!

---

## Step 6: Deploy the Live Link (Production Hosting)

Now that the application works locally with your AWS resources, you are ready to host the frontend code on a web server so that it can be accessed via a public link.

### Option A: Deploying on AWS Amplify (AWS Native Way)
1. Navigate to the **AWS Amplify** console in your browser.
2. Click **Create new app**.
3. Connect your repository (GitHub, GitLab, AWS CodeCommit, etc.) containing this project.
4. Amplify will automatically detect it as a Next.js application. Click **Next**.
5. Under **Environment variables**, click **Add variable** and insert the exact keys we set in your `.env.local`:
   * `AWS_REGION` = `eu-north-1`
   * `AWS_ACCESS_KEY_ID` = `YOUR_AWS_ACCESS_KEY_ID`
   * `AWS_SECRET_ACCESS_KEY` = `YOUR_AWS_SECRET_ACCESS_KEY`
   * `S3_BUCKET_NAME` = `cloudvault-storage-divya-5678-600159355341-eu-north-1-an`
   * `DYNAMODB_TABLE_NAME` = `CloudVaultFiles1`
6. Click **Save and deploy**. Amplify will build the application and provide a secure, HTTPS live URL!

### Option B: Deploying on Vercel
1. Go to [vercel.com](https://vercel.com) and sign in.
2. Click **Add New** -> **Project**.
3. Import your Git repository.
4. Expand the **Environment Variables** section and copy-paste the environment variables listed above.
5. Click **Deploy**. Vercel will deploy the application in under 2 minutes and give you a live URL!
