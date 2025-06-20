# Salesforce Connected App Setup Guide

To connect SecureForce Pro to your Salesforce organization, you need to create a Connected App in Salesforce and configure the OAuth settings.

## Step 1: Create a Connected App in Salesforce

1. **Log in to your Salesforce org** (Sandbox recommended for testing)

2. **Navigate to Setup**
   - Click the gear icon in the top right
   - Select "Setup"

3. **Create Connected App**
   - In the Quick Find box, search for "App Manager"
   - Click "App Manager"
   - Click "New Connected App"

4. **Fill in Basic Information**
   ```
   Connected App Name: SecureForce Pro
   API Name: SecureForce_Pro
   Contact Email: your-email@company.com
   Description: Enterprise Salesforce Security Platform
   ```

5. **Configure OAuth Settings**
   - Check "Enable OAuth Settings"
   - **Callback URL**: `http://localhost:5173/auth/callback`
   - **Selected OAuth Scopes**:
     - Access and manage your data (api)
     - Perform requests on your behalf at any time (refresh_token, offline_access)
     - Access your basic information (id, profile, email, address, phone)
     - Full access (full)

6. **Additional Security Settings**
   - Check "Require Secret for Web Server Flow"
   - Check "Require Secret for Refresh Token Flow"
   - **IP Relaxation**: "Relax IP restrictions"

7. **Save the Connected App**
   - Click "Save"
   - Wait for the app to be created (may take 2-10 minutes)

## Step 2: Get Your OAuth Credentials

1. **Navigate back to your Connected App**
   - Setup → App Manager
   - Find "SecureForce Pro" and click the dropdown → "View"

2. **Copy the credentials**
   - **Consumer Key** (this is your Client ID)
   - **Consumer Secret** (this is your Client Secret)
   - Click "Click to reveal" to see the Consumer Secret

## Step 3: Configure Environment Variables

1. **Create a `.env` file** in your project root:
   ```env
   VITE_SALESFORCE_CLIENT_ID=your_consumer_key_here
   VITE_SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
   VITE_SALESFORCE_REDIRECT_URI=http://localhost:5173/auth/callback
   ```

2. **Replace the placeholder values** with your actual Connected App credentials

## Step 4: Test the Connection

1. **Restart your development server**
   ```bash
   npm run dev
   ```

2. **Try connecting to Salesforce**
   - Click "Connect Salesforce" in the dashboard
   - Select "Sandbox" (recommended for testing)
   - You should be redirected to Salesforce login

## Troubleshooting

### Common Issues:

1. **"invalid_client_id" error**
   - Double-check your Consumer Key in the .env file
   - Ensure the Connected App is saved and active
   - Wait 2-10 minutes after creating the Connected App

2. **"redirect_uri_mismatch" error**
   - Verify the Callback URL in your Connected App matches exactly: `http://localhost:5173/auth/callback`
   - Check that VITE_SALESFORCE_REDIRECT_URI in .env matches

3. **"invalid_client" error**
   - Verify your Consumer Secret is correct
   - Ensure "Require Secret for Web Server Flow" is enabled

4. **Permission errors**
   - Make sure all required OAuth scopes are selected
   - Check that IP restrictions are relaxed

### Production Deployment:

For production deployment, update:
- **Callback URL** to your production domain
- **VITE_SALESFORCE_REDIRECT_URI** to your production callback URL
- Consider using **My Domain** in Salesforce for additional security

## Security Best Practices

1. **Use Sandbox for Development**: Always test with a Sandbox org first
2. **Least Privilege**: Only grant necessary OAuth scopes
3. **Secure Storage**: Never commit .env files to version control
4. **Regular Rotation**: Rotate Consumer Secret regularly
5. **Monitor Usage**: Review Connected App usage in Salesforce Setup

## Required Salesforce Permissions

The connected user should have permissions to:
- Read Apex Classes
- Read Profiles and Permission Sets
- Read User records
- Access Tooling API
- Read Organization settings

For security analysis, a user with "View Setup and Configuration" permission is recommended.