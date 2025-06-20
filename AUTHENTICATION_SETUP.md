# Salesforce Authentication Setup Guide

## Current Issues and Solutions

### Issue 1: CORS Demo Server Access
**Problem**: The cors-anywhere.herokuapp.com demo server requires manual activation
**Solution**: Visit https://cors-anywhere.herokuapp.com/corsdemo and enable access

### Issue 2: Connected App Configuration
**Problem**: Your Connected App may not be properly configured
**Solution**: Follow these steps to create/update your Connected App

## Step-by-Step Connected App Setup

### 1. Create Connected App in Salesforce

1. **Log into your Salesforce org**
   - Use your developer org or sandbox

2. **Navigate to Setup**
   - Click the gear icon → Setup

3. **Create Connected App**
   - Quick Find: "App Manager"
   - Click "New Connected App"

4. **Basic Information**
   ```
   Connected App Name: TrustHunt Enterprise
   API Name: TrustHunt_Enterprise
   Contact Email: your-email@domain.com
   Description: Enterprise Salesforce Security Platform
   ```

5. **OAuth Settings** (CRITICAL)
   ```
   ✅ Enable OAuth Settings
   Callback URL: http://localhost:5173/auth/callback
   
   Selected OAuth Scopes:
   ✅ Access and manage your data (api)
   ✅ Perform requests on your behalf at any time (refresh_token, offline_access)
   ✅ Access your basic information (id, profile, email, address, phone)
   ✅ Full access (full)
   ```

6. **Additional Settings**
   ```
   ✅ Require Secret for Web Server Flow
   ✅ Require Secret for Refresh Token Flow
   IP Relaxation: Relax IP restrictions
   ```

### 2. Get Your Credentials

1. **After saving**, wait 2-10 minutes for the app to be created
2. **Go back to App Manager** → Find your app → View
3. **Copy these values**:
   - Consumer Key (this is your Client ID)
   - Consumer Secret (click "Click to reveal")

### 3. Update Environment Variables

Create/update your `.env` file:
```env
VITE_SALESFORCE_CLIENT_ID=your_consumer_key_here
VITE_SALESFORCE_CLIENT_SECRET=your_consumer_secret_here
VITE_SALESFORCE_REDIRECT_URI=http://localhost:5173/auth/callback
```

### 4. Test Connection

1. **Restart your dev server**: `npm run dev`
2. **Try the Token Authentication method first** (most reliable)
3. **Get a valid access token**:
   - Open browser dev tools (F12)
   - Log into Salesforce
   - Go to Network tab
   - Look for any API request
   - Copy the Authorization header token (after "Bearer ")

## Troubleshooting Common Issues

### "Invalid Client ID" Error
- Double-check your Consumer Key in .env
- Ensure Connected App is saved and active
- Wait 2-10 minutes after creating the app

### "Redirect URI Mismatch" Error
- Verify callback URL is exactly: `http://localhost:5173/auth/callback`
- Check VITE_SALESFORCE_REDIRECT_URI matches

### "Invalid Client" Error
- Verify Consumer Secret is correct
- Ensure "Require Secret for Web Server Flow" is enabled

### CORS/Network Errors
- Enable CORS demo server: https://cors-anywhere.herokuapp.com/corsdemo
- Check internet connection
- Verify instance URL format

## Recommended Authentication Flow

1. **Use Token Authentication** (most reliable for testing)
2. **Get token from browser dev tools** after logging into Salesforce
3. **Use your actual instance URL** (not the demo one)
4. **Enable CORS demo server** before attempting connection

## Security Notes

- Never commit .env files to version control
- Use sandbox/developer orgs for testing
- Rotate secrets regularly in production
- Consider IP restrictions for production use