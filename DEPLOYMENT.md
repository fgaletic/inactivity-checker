# Koyeb Deployment Guide

This guide will help you deploy the Inactivity Checker to Koyeb and configure it to run daily at 8 AM ET.

## Prerequisites

1. **Koyeb Account**: Sign up at [koyeb.com](https://koyeb.com)
2. **Docker Hub Account**: For container registry (or use Koyeb's built-in registry)
3. **Environment Variables**: Gather all required API keys and tokens

## Required Environment Variables

Set these in your Koyeb service configuration:

### Go High Level (GHL)
- `GHL_API_KEY` - Your Go High Level API key
- `GHL_LOCATION_ID` - Your GHL location ID

### Pike13
- `PIKE13_API_TOKEN` - Your Pike13 API token  
- `PIKE13_BASE_URL` - Pike13 API base URL (usually `https://api.pike13.com`)

### Optional
- `TEST_EMAIL` - For testing with a specific email address
- `DRY_RUN` - Set to "true" for testing without making actual changes

## Deployment Steps

### Method 1: Using Koyeb CLI (Recommended)

1. **Install Koyeb CLI**:
   ```bash
   # macOS
   brew install koyeb/tap/koyeb
   
   # Linux/Windows
   curl -fsSL https://koyeb.com/install.sh | sh
   ```

2. **Login to Koyeb**:
   ```bash
   koyeb auth login
   ```

3. **Deploy the service**:
   ```bash
   koyeb service create inactivity-checker \
     --dockerfile ./Dockerfile \
     --env GHL_API_KEY=your_ghl_api_key \
     --env GHL_LOCATION_ID=your_ghl_location_id \
     --env PIKE13_API_TOKEN=your_pike13_token \
     --env PIKE13_BASE_URL=https://api.pike13.com \
     --env DRY_RUN=false
   ```

### Method 2: Using Koyeb Dashboard

1. **Build and push Docker image**:
   ```bash
   # Build the image
   docker build -t your-dockerhub-username/inactivity-checker:latest .
   
   # Push to Docker Hub
   docker push your-dockerhub-username/inactivity-checker:latest
   ```

2. **Create service in Koyeb dashboard**:
   - Go to [Koyeb Dashboard](https://app.koyeb.com)
   - Click "Create Service"
   - Choose "Deploy from Docker Hub"
   - Enter your image: `your-dockerhub-username/inactivity-checker:latest`
   - Configure environment variables
   - Deploy

### Method 3: Using GitHub Integration

1. **Push code to GitHub repository**
2. **Connect GitHub to Koyeb**:
   - In Koyeb dashboard, go to "GitHub" tab
   - Connect your repository
   - Create service from repository
   - Koyeb will auto-deploy on git push

## Configuration

### Environment Variables in Koyeb

1. Go to your service in Koyeb dashboard
2. Click "Settings" → "Environment Variables"
3. Add each required variable:

```
GHL_API_KEY=your_actual_api_key
GHL_LOCATION_ID=your_location_id
PIKE13_API_TOKEN=your_pike13_token
PIKE13_BASE_URL=https://api.pike13.com
DRY_RUN=false
```

### Scheduling

The application is configured to run daily at **8 AM Eastern Time** (1 PM UTC). This is handled by the built-in cron scheduler using `node-cron`.

**Note**: The scheduler runs in UTC, so 8 AM ET = 1 PM UTC (EST) or 12 PM UTC (EDT).

## Monitoring

### Logs
- View logs in Koyeb dashboard under your service
- Look for messages like:
  - `✅ Scheduler initialized: every day at 8 AM ET (1 PM UTC)`
  - `🕗 [Cron] Daily inactive client sync started at 8 AM ET...`
  - `📬 Sent to GHL: [Name] ([email])`

### Health Checks
- The service exposes a health check endpoint at `/`
- Koyeb will monitor the service health automatically

## Troubleshooting

### Common Issues

1. **"No token found" error**:
   - The Pike13 token needs to be obtained through OAuth flow
   - First run locally to complete OAuth, then copy the token

2. **API rate limits**:
   - Pike13 and GHL have rate limits
   - The app includes delays between requests

3. **Timezone issues**:
   - The cron runs at 1 PM UTC (8 AM EST)
   - Adjust the cron expression in `scheduler.js` if needed

### Getting Pike13 Token

1. **Run locally first**:
   ```bash
   npm install
   npm start
   ```

2. **Complete OAuth flow**:
   - Browser will open for Pike13 authorization
   - Complete the flow to get the token

3. **Copy token**:
   - The token is saved in `token.json`
   - Copy the `accessToken` value to your Koyeb environment variables

## Security Notes

- Never commit API keys to version control
- Use Koyeb's secret management for sensitive data
- Consider using environment-specific API keys for production

## Scaling

- The service is designed to run as a single instance
- Each run processes all inactive clients
- No additional scaling configuration needed

## Updates

To update the service:
1. Push changes to your repository
2. If using GitHub integration, Koyeb will auto-deploy
3. If using Docker Hub, rebuild and push the image, then update the service

## Support

- Check Koyeb documentation: [docs.koyeb.com](https://docs.koyeb.com)
- Review application logs in Koyeb dashboard
- Test with `DRY_RUN=true` to verify configuration
