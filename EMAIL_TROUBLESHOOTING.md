# Email OTP Troubleshooting Guide

## Problem
Users are not receiving OTP emails when creating accounts on the live production site.

## Common Causes & Solutions

### 1. Missing Environment Variables
Railway needs these environment variables set:

```bash
# Required Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-production-email@gmail.com
EMAIL_PASSWORD=your-app-password  # NOT your regular password!
EMAIL_FROM=Virello Food <noreply@virellofoods.com>

# OTP Configuration
OTP_METHOD=email

# Frontend URL
FRONTEND_URL=https://virellofoods.com
```

### 2. Gmail App Password Issues
- **Problem**: Using regular Gmail password instead of App Password
- **Solution**: Generate App Password in Gmail settings
  1. Go to Google Account settings
  2. Security → 2-Step Verification → App passwords
  3. Generate password for "Mail"
  4. Use this password in `EMAIL_PASSWORD`

### 3. Gmail Security Settings
- **Problem**: Gmail blocking "less secure apps"
- **Solution**: Enable 2-Factor Authentication and use App Password

### 4. Railway Environment Variables
Check if variables are properly set in Railway dashboard:
1. Go to Railway project dashboard
2. Click on your service
3. Go to Variables tab
4. Verify all email variables are set

### 5. Email Service Provider Limits
- **Gmail**: 500 emails/day for free accounts
- **Solution**: Consider upgrading to Google Workspace or use SendGrid

## Testing Steps

### Step 1: Test Email Configuration
Visit: `https://virello-backend-production.up.railway.app/api/auth/test-email-config`
(Requires admin authentication)

### Step 2: Check Server Logs
Look for these log messages in Railway:
- `📧 Environment check:`
- `📧 Email OTP result:`
- `❌ Email OTP error:`

### Step 3: Test Registration
1. Try registering a new user
2. Check server logs for email sending status
3. Check spam folder for OTP email

## Quick Fixes

### Fix 1: Set Missing Variables
If variables are missing, add them to Railway:
```bash
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Virello Food <noreply@virellofoods.com>
OTP_METHOD=email
FRONTEND_URL=https://virellofoods.com
```

### Fix 2: Use Console OTP (Temporary)
If email is not working, temporarily use console OTP:
```bash
OTP_METHOD=console
```
This will log OTP to server console instead of sending email.

### Fix 3: Alternative Email Service
Consider using SendGrid or Mailgun for better reliability:
```bash
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-sendgrid-key
```

## Monitoring

### Check Email Delivery
1. Monitor Railway logs for email sending attempts
2. Check Gmail sent folder (if using Gmail)
3. Monitor bounce rates and delivery failures

### User Experience
1. Add loading states during email sending
2. Provide "Resend OTP" functionality
3. Show clear error messages if email fails

## Next Steps

1. **Immediate**: Check Railway environment variables
2. **Short-term**: Test email configuration endpoint
3. **Long-term**: Consider upgrading to professional email service

## Support Commands

### Test Email Config (Admin Only)
```bash
GET /api/auth/test-email-config
```

### Check Environment Variables
Look for these in Railway logs:
- EMAIL_SERVICE
- EMAIL_USER
- EMAIL_PASSWORD
- EMAIL_FROM
- OTP_METHOD
