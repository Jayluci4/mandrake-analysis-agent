# Google OAuth Setup Guide

## Quick Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google+ API

2. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - Your production URL (when deploying)
   - No redirect URIs needed for implicit flow

3. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Replace `your_google_client_id_here` with your actual Client ID
   ```bash
   cp .env.example .env
   # Edit .env and add your Google Client ID
   ```

4. **Security Features Implemented**
   - ✅ Blocks disposable/temporary email addresses
   - ✅ Risk scoring system (0-100)
   - ✅ Email verification check
   - ✅ Token validation
   - ✅ Session management with 24-hour expiry
   - ✅ Automatic logout on session expiry

## Testing

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Click the "Sign in with Google" button in the header

3. The system will:
   - Validate the email domain (blocks 50+ disposable email services)
   - Check if email is verified by Google
   - Create a secure session
   - Display user info in the header

## Blocked Email Domains

The following disposable email services are automatically blocked:
- tempmail.com, 10minutemail.com, guerrillamail.com
- mailinator.com, throwaway.email, yopmail.com
- And 40+ other temporary email services

## Risk Scoring

Each login attempt is assigned a risk score:
- **0-10**: Trusted providers (Gmail, Outlook, etc.)
- **5**: Educational (.edu) or government (.gov) domains
- **30**: Unknown but valid domains
- **50+**: Suspicious patterns detected
- **90-100**: Blocked (disposable emails, unverified, etc.)

## Backend Integration (Optional)

For production, implement backend token verification:

```javascript
// backend/routes/auth.js
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  
  // Verify token with Google
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: GOOGLE_CLIENT_ID
  });
  
  const payload = ticket.getPayload();
  
  // Additional validation
  if (isDisposableEmail(payload.email)) {
    return res.status(403).json({ error: 'Disposable emails not allowed' });
  }
  
  // Create session
  req.session.user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name
  };
  
  res.json({ success: true });
});
```

## Environment Variables

```env
# Required
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Optional (for backend)
VITE_API_URL=http://localhost:8000
```

## Troubleshooting

1. **"Invalid token audience" error**
   - Ensure your Google Client ID in .env matches the one in Google Cloud Console

2. **"Disposable email not allowed" error**
   - The email domain is in the blocked list
   - Use a legitimate email provider

3. **Session expires too quickly**
   - Sessions are set to 24 hours by default
   - Modify `SESSION_DURATION` in AuthContext.tsx if needed

## Security Considerations

1. **Never commit .env files** - Already added to .gitignore
2. **Use HTTPS in production** - Required by Google OAuth
3. **Implement rate limiting** - Prevent brute force attempts
4. **Monitor high-risk logins** - Log attempts with risk score > 50
5. **Regular security audits** - Update blocked domain list regularly