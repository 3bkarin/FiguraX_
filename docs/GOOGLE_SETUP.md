# Google Cloud Setup Guide

## 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Note the **Project ID** (e.g., `figurax-store-12345`)

## 2. Enable Required APIs

Navigate to **APIs & Services → Library** and enable:
- **Google Sheets API**
- **Google Drive API**
- **Gmail API**

## 3. Create Service Account

1. Go to **IAM & Admin → Service Accounts**
2. Click **Create Service Account**
3. Name: `figurax-backend`
4. Grant **Editor** role (optional, for project-level access)
5. Create and download **JSON key file**
6. Note the **Client Email** (e.g., `figurax-backend@figurax-store-12345.iam.gserviceaccount.com`)

## 4. Share Google Sheet

1. Open your Google Sheet (ID: `1ssCowPsU-GYSTBrFD093l5eNUvPp5851JuZY7eDLkvA`)
2. Click **Share**
3. Add service account email as **Editor**
4. Copy the **Sheet ID** from URL

## 5. Share Google Drive Folder

1. Open Drive folder (ID: `1z1vjxMcmQ2n3ZH32mgi11jTHfOYG6WLm`)
2. Right-click → **Share**
3. Add service account email as **Editor**
4. Copy the **Folder ID** from URL

## 6. Configure Gmail OAuth2

1. Go to **APIs & Services → Credentials**
2. Create **OAuth 2.0 Client ID** (Web Application)
3. Authorized redirect URIs:
   - `https://developers.google.com/oauthplayground`
4. Save and note **Client ID** and **Client Secret**

### Get Refresh Token

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
2. Click **Settings** (gear icon) → Check **Use your own OAuth credentials**
3. Enter your Client ID and Client Secret
4. In **Step 1**, select:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.compose`
5. Click **Authorize APIs**
6. Allow access for `figuraxverse@gmail.com`
7. In **Step 2**, click **Exchange authorization code for tokens**
8. Copy **Refresh Token**

## 7. Environment Variables

```env
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=1ssCowPsU-GYSTBrFD093l5eNUvPp5851JuZY7eDLkvA
GOOGLE_DRIVE_FOLDER_ID=1z1vjxMcmQ2n3ZH32mgi11jTHfOYG6WLm

GMAIL_CLIENT_ID=your-oauth-client-id
GMAIL_CLIENT_SECRET=your-oauth-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
GMAIL_SENDER=figuraxverse@gmail.com
```

## 8. Verify Setup

Run initialization:
```bash
cd backend
npm run init:sheets
```

Check console for:
```
✅ Google Sheets connection OK
✅ Google Drive connection OK
✅ Gmail connection OK
✅ All sheets initialized
✅ Drive folders initialized
```

## Troubleshooting

### 403 Forbidden on Sheets
- Service account not shared on Sheet
- Sheet ID incorrect
- Sheets API not enabled

### 403 Forbidden on Drive
- Service account not shared on Drive folder
- Folder ID incorrect
- Drive API not enabled

### Gmail 401 Unauthorized
- Refresh token expired (regenerate via OAuth Playground)
- Wrong Client ID/Secret
- Gmail API not enabled

### Private Key Format
The private key must include literal `\n` newlines in the env file:
```
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

In code, it's converted back to real newlines:
```javascript
privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
```