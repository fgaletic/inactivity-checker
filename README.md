# Method3 Fitness - Pike13 Inactivity Checker

Automatically sync inactive clients from Pike13 to GoHighLevel with the "Pike13 Inactive" tag.

## 🔄 How It Works

1. **Daily Sync at 8 AM PT (4 PM UTC)**
   - Fetches all clients with active plans from Pike13
   - **Adds** "Pike13 Inactive" tag to clients inactive for 10+ days
   - **Removes** "Pike13 Inactive" tag from clients who become active (≤10 days)
   - Preserves all other tags on the contact

2. **Tag Management**
   - ✅ Adding tags: Uses `POST /contacts/{id}/tags` - **only adds**, never removes other tags
   - ✅ Removing tags: Uses `POST /contacts/{id}/tags.remove` - **only removes "Pike13 Inactive"**
   - ✅ Safe: Your other tags are never touched!

## 🚀 Deployment (Koyeb)

### Required Environment Variables

```bash
# Pike13 API
PIKE13_API_TOKEN=your_pike13_token
PIKE13_CLIENT_ID=your_client_id
PIKE13_CLIENT_SECRET=your_client_secret
PIKE13_REDIRECT_URI=your_redirect_uri

# GoHighLevel API
GHL_API_KEY=your_ghl_api_key
GHL_LOCATION_ID=your_location_id

# Environment
NODE_ENV=production
PORT=8000
```

### Deployment Steps

1. Push code to GitHub
2. Connect Koyeb to your GitHub repo
3. Set environment variables in Koyeb dashboard
4. Deploy!

The scheduler will:
- Start automatically when the app deploys
- Run an initial sync on startup (in production mode)
- Run daily at 8 AM PT (4 PM UTC)

## 🧪 Testing & Manual Sync

### Run Manual Sync (Local)

```bash
# Normal sync
npm run sync

# Dry run (no changes to GoHighLevel)
DRY_RUN=true npm run sync
```

### Trigger Sync via API

```bash
curl -X POST https://your-app.koyeb.app/sync-inactive-clients
```

### Health Check

```bash
curl https://your-app.koyeb.app/health
```

## 📊 What Gets Synced

### Clients Added to GoHighLevel
- Have active plans in Pike13
- Plan is not on hold
- Inactive for 10+ days (haven't visited in 10+ days)

### Tag Removed
- Clients who become active again (≤10 days since last visit)

## 🛠️ Development

### Local Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Start server
npm start

# Run manual sync
npm run sync
```

### Project Structure

```
├── server.js              # Express server & startup
├── scheduler.js           # Cron job scheduler
├── logic.js              # Main business logic
├── api.js                # Pike13 API client
├── sendToGoHighLevel.js  # GHL tag management
├── removeInactiveTagIfActive.js  # Tag removal
├── manual-sync.js        # Manual sync script
└── locations.js          # GHL location helpers
```

## 📝 Logs

Check Koyeb logs to see:
- When scheduler starts
- Daily sync execution (8 AM PT)
- How many clients processed
- Any errors

## 🔐 Security

- Never commit `.env` or `token.json`
- Use environment variables in production
- Tokens are stored securely in Koyeb

## 📞 Support

For issues or questions, check the logs first:
1. Koyeb deployment logs
2. Look for error messages or failed API calls
3. Verify environment variables are set correctly
