# Platform Setup Guide

This guide walks you through setting up CARE OS integrations with Slack and Microsoft Teams.

---

## Slack Setup

### 1. Create a Slack App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Enter:
   - **App Name**: CARE OS
   - **Workspace**: Select your development workspace
4. Click **"Create App"**

### 2. Configure OAuth & Permissions

1. In your app settings, go to **"OAuth & Permissions"**
2. Scroll to **"Scopes"** and add these **Bot Token Scopes**:

   ```
   - chat:write
   - commands
   - users:read
   - users:read.email
   - app_mentions:read
   - im:history
   - im:write
   ```

3. Scroll to **"OAuth Tokens"** and click **"Install to Workspace"**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
   - Add this to your `.env` as `SLACK_BOT_TOKEN`

### 3. Get Signing Secret

1. Go to **"Basic Information"** in the sidebar
2. Scroll to **"App Credentials"**
3. Copy the **Signing Secret**
   - Add this to your `.env` as `SLACK_SIGNING_SECRET`

### 4. Enable Event Subscriptions

1. Go to **"Event Subscriptions"** in the sidebar
2. Toggle **"Enable Events"** to ON
3. Set **Request URL** to:
   ```
   https://your-domain.com/webhooks/slack/events
   ```
   
   💡 For local development, use [ngrok](https://ngrok.com/):
   ```bash
   ngrok http 3000
   # Use the HTTPS URL: https://abc123.ngrok.io/webhooks/slack/events
   ```

4. Under **"Subscribe to bot events"**, add:
   ```
   - app_home_opened
   - app_mention
   - message.im
   ```

5. Click **"Save Changes"**

### 5. Enable Interactivity

1. Go to **"Interactivity & Shortcuts"**
2. Toggle **"Interactivity"** to ON
3. Set **Request URL** to:
   ```
   https://your-domain.com/webhooks/slack/interactions
   ```
4. Click **"Save Changes"**

### 6. Create Slash Commands

1. Go to **"Slash Commands"** in the sidebar
2. Click **"Create New Command"** for each:

   **Command**: `/checkin`
   - **Request URL**: `https://your-domain.com/webhooks/slack/commands`
   - **Short Description**: Start your daily wellbeing check-in
   - **Usage Hint**: (leave empty)

   **Command**: `/tasks`
   - **Request URL**: `https://your-domain.com/webhooks/slack/commands`
   - **Short Description**: View your tasks
   - **Usage Hint**: (leave empty)

   **Command**: `/recognize`
   - **Request URL**: `https://your-domain.com/webhooks/slack/commands`
   - **Short Description**: Recognize a teammate
   - **Usage Hint**: @user message

3. Click **"Save"** for each command

### 7. Configure App Home

1. Go to **"App Home"** in the sidebar
2. Under **"Show Tabs"**:
   - Toggle **"Home Tab"** to ON
   - Toggle **"Messages Tab"** to ON
3. Click **"Save Changes"**

### 8. Update Your .env

Add all credentials to your `.env` file:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
```

### 9. Test the Integration

1. Start CARE OS:
   ```bash
   npm run dev
   ```

2. In Slack:
   - Go to your app's **App Home**
   - Try the `/checkin` command
   - Mention your bot: `@CARE OS hello`

---

## Microsoft Teams Setup

### 1. Register a Bot

1. Go to [Azure Bot Service](https://portal.azure.com/#create/Microsoft.BotServiceConnectivityGalleryPackage)
2. Fill in:
   - **Bot handle**: care-os-bot
   - **Subscription**: Your Azure subscription
   - **Resource group**: Create new or use existing
   - **Pricing tier**: F0 (free)
   - **App type**: Multi Tenant
3. Click **"Create"**

### 2. Get App ID and Password

1. Once created, go to your bot resource
2. Navigate to **"Configuration"**
3. Copy the **Microsoft App ID**
   - Add to `.env` as `TEAMS_APP_ID`
4. Click **"Manage"** next to Microsoft App ID
5. Go to **"Certificates & secrets"** → **"New client secret"**
6. Copy the secret **Value** (not ID)
   - Add to `.env` as `TEAMS_APP_PASSWORD`

### 3. Configure Messaging Endpoint

1. In your bot's **Configuration** page
2. Set **Messaging endpoint** to:
   ```
   https://your-domain.com/webhooks/teams/messages
   ```
   
   💡 For local development with ngrok:
   ```
   https://abc123.ngrok.io/webhooks/teams/messages
   ```

3. Click **"Apply"**

### 4. Connect to Teams Channel

1. Go to **"Channels"** in your bot settings
2. Click on **Microsoft Teams** icon
3. Click **"Save"** to enable Teams channel

### 5. Create Teams App Manifest

Create `teams-manifest/manifest.json`:

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "version": "1.0.0",
  "id": "YOUR_TEAMS_APP_ID",
  "packageName": "com.careos.bot",
  "developer": {
    "name": "Your Organization",
    "websiteUrl": "https://your-domain.com",
    "privacyUrl": "https://your-domain.com/privacy",
    "termsOfUseUrl": "https://your-domain.com/terms"
  },
  "name": {
    "short": "CARE OS",
    "full": "CARE OS - Wellbeing & Task Management"
  },
  "description": {
    "short": "Human-centered wellbeing and task management",
    "full": "CARE OS helps teams stay connected with daily check-ins, task management, and peer recognition."
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#4A90E2",
  "bots": [
    {
      "botId": "YOUR_TEAMS_APP_ID",
      "scopes": ["personal", "team"],
      "supportsFiles": false,
      "isNotificationOnly": false,
      "commandLists": [
        {
          "scopes": ["personal", "team"],
          "commands": [
            {
              "title": "checkin",
              "description": "Start your daily check-in"
            },
            {
              "title": "tasks",
              "description": "View your tasks"
            },
            {
              "title": "recognize",
              "description": "Recognize a teammate"
            }
          ]
        }
      ]
    }
  ],
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": ["your-domain.com"]
}
```

### 6. Package and Upload

1. Create icons (32x32 outline.png, 192x192 color.png)
2. Zip the manifest and icons:
   ```bash
   cd teams-manifest
   zip -r ../care-os-teams.zip manifest.json outline.png color.png
   ```

3. In Teams:
   - Go to **Apps** → **Manage your apps** → **Upload an app**
   - Select **Upload a custom app**
   - Upload `care-os-teams.zip`

### 7. Update Your .env

```env
TEAMS_APP_ID=your-app-id
TEAMS_APP_PASSWORD=your-app-secret
TEAMS_TENANT_ID=your-tenant-id (optional)
```

### 8. Test the Integration

1. Start CARE OS:
   ```bash
   npm run dev
   ```

2. In Teams:
   - Find your CARE OS bot
   - Send a message: `hello`
   - Try `/checkin`

---

## Production Deployment

### Requirements

- Publicly accessible HTTPS endpoint
- Valid SSL certificate
- Database and Redis hosted with encryption

### Recommended Hosting

- **API**: Heroku, AWS ECS, Google Cloud Run
- **Database**: AWS RDS PostgreSQL, Google Cloud SQL
- **Redis**: AWS ElastiCache, Redis Cloud
- **Webhooks**: Use a reverse proxy (nginx/cloudflare)

### Environment Setup

1. Set all environment variables in your hosting platform
2. Run database migration:
   ```bash
   psql $DATABASE_URL -f src/database/schema.sql
   ```
3. Ensure Redis is accessible
4. Deploy your application
5. Update webhook URLs in Slack/Teams to production domain

---

## Troubleshooting

### Slack Issues

**"url_verification failed"**
- Ensure your server is publicly accessible
- Check that `/webhooks/slack/events` responds to POST requests

**"Missing signing secret"**
- Verify `SLACK_SIGNING_SECRET` is set correctly in `.env`
- Restart your server after updating `.env`

**Slash commands not working**
- Check that Request URL matches your server
- Verify `/webhooks/slack/commands` endpoint exists

### Teams Issues

**Bot not responding**
- Check `/webhooks/teams/messages` is accessible
- Verify App ID and Password are correct
- Check Azure Bot Service logs

**Cannot upload app**
- Ensure manifest.json has valid schema
- Check that all required fields are filled
- Verify icons are correct dimensions

---

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for all secrets
3. **Enable HTTPS** for all webhook endpoints
4. **Rotate secrets** periodically
5. **Monitor audit logs** for suspicious activity
6. **Implement rate limiting** on webhook endpoints

---

## Next Steps

- Review [Ethical Guardrails](ETHICAL_GUARDRAILS.md)
- Read [API Documentation](API.md)
- Check [Deployment Guide](DEPLOYMENT.md)

---

For support, open an issue on GitHub or contact your administrator.
