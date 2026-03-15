# Frontend Deployment Configuration

## Environment Variables

Create a `.env.production` file in the frontend directory with:

```
NEXT_PUBLIC_API_URL=http://69.62.125.138:5041/api
```

This will make all API calls point to your VPS instead of localhost.

## Build and Deploy

1. Install dependencies:
```bash
npm install
```

2. Build for production:
```bash
npm run build
```

3. Start production server:
```bash
npm start
```

Or use PM2 for process management:
```bash
pm2 start npm --name "ims-frontend" -- start
```

## Google OAuth Setup

### 1. Go to Google Cloud Console
https://console.cloud.google.com/

### 2. Navigate to APIs & Services > Credentials

### 3. Click on your OAuth 2.0 Client ID

### 4. Add Authorized Redirect URIs

Add this exact URL to the "Authorized redirect URIs" section:

```
http://69.62.125.138:5041/api/google/callback
```

**Important:** Make sure there are NO trailing slashes!

### 5. Click "Save"

### 6. Also Add (if needed for frontend auth):

```
http://69.62.125.138:5041/auth/callback
```

## Backend Configuration

Make sure your backend `.env` has:

```
GOOGLE_REDIRECT_URI=http://69.62.125.138:5041/api/google/callback
CORS_ORIGIN=http://69.62.125.138:5041
```

Since you've already set CORS to `*`, it will accept requests from any origin (which is fine for testing, but consider restricting it in production).

## Testing the Deployment

1. Open browser: http://69.62.125.138:5041
2. Login with admin credentials
3. Go to Dashboard
4. Click "Connect Google" button
5. Authorize the app
6. Test features:
   - Fetch emails
   - Scan Drive
   - Schedule interview
   - Generate Meet link

## Troubleshooting

### If Google OAuth fails:
- Check redirect URI matches exactly in Google Console
- Check backend logs for errors
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
- Try revoking access and reconnecting

### If API calls fail:
- Check CORS settings
- Verify backend is running on port 5041
- Check browser console for errors
- Verify NEXT_PUBLIC_API_URL is set correctly
