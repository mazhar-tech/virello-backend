# Resend Email Service Integration

This document explains how to set up and use Resend as a fallback email service for the Virello Food backend.

## Overview

The email service now includes Resend as a fallback mechanism. When the primary email service (Gmail SMTP) fails or times out, the system automatically attempts to send emails via Resend.

## Setup Instructions

### 1. Get Resend API Key

1. Visit [Resend.com](https://resend.com)
2. Sign up for a free account
3. Go to [API Keys](https://resend.com/api-keys)
4. Create a new API key
5. Copy the API key (starts with `re_`)

### 2. Configure Environment Variables

Add the following variables to your `.env` file:

```env
# Resend Configuration (fallback email service)
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=Virello Food <noreply@virellofoods.com>
```

### 3. Domain Setup (Optional but Recommended)

For production use, it's recommended to:
1. Add your domain to Resend
2. Verify your domain
3. Update `RESEND_FROM_EMAIL` to use your verified domain

## How It Works

### Fallback Mechanism

1. **Primary Service**: The system first attempts to send emails via the configured primary service (Gmail SMTP)
2. **Retry Logic**: If the primary service fails, it retries up to 3 times with exponential backoff
3. **Fallback to Resend**: If all primary service attempts fail, the system automatically switches to Resend
4. **Success/Failure**: The system reports which service was used for the email

### Email Types Supported

- **Verification Emails**: User registration email verification
- **Password Reset Emails**: Password reset functionality
- **Custom Emails**: Any other email functionality

## Testing

### Test Resend Connection

Run the test script to verify your Resend configuration:

```bash
node test-resend-connection.js
```

This will:
- Check if `RESEND_API_KEY` is configured
- Test the Resend API connection
- Verify the integration is working

### Test Email Sending

To test actual email sending, uncomment the test email section in `test-resend-connection.js` and replace `your-test-email@example.com` with your actual email address.

## Logging

The system provides detailed logging for email operations:

```
📤 Attempt 1/3 - Sending email via primary service...
❌ Attempt 1/3 failed: Email sending timeout
🔄 Primary service failed, attempting fallback to Resend...
📧 Attempting to send email via Resend...
✅ Email sent successfully via Resend!
📧 Resend ID: abc123-def456-ghi789
✅ Fallback to Resend successful!
```

## Benefits

1. **Reliability**: Automatic fallback ensures emails are delivered even if primary service fails
2. **Free Tier**: Resend offers 3,000 emails/month for free
3. **Better Deliverability**: Resend has excellent deliverability rates
4. **Easy Setup**: Simple API-based integration
5. **Detailed Logging**: Clear visibility into which service was used

## Troubleshooting

### Common Issues

1. **API Key Not Set**
   - Error: `RESEND_API_KEY not configured`
   - Solution: Add your Resend API key to `.env` file

2. **Invalid API Key**
   - Error: `Invalid API key`
   - Solution: Verify your API key is correct and active

3. **Domain Not Verified**
   - Error: `Domain not verified`
   - Solution: Verify your domain in Resend dashboard or use a verified domain

4. **Rate Limiting**
   - Error: `Rate limit exceeded`
   - Solution: Wait before sending more emails or upgrade your Resend plan

### Debug Mode

To enable more detailed logging, set:

```env
LOG_LEVEL=debug
```

## Production Considerations

1. **Domain Verification**: Use a verified domain for better deliverability
2. **Rate Limits**: Monitor your email volume against Resend's free tier limits
3. **Monitoring**: Set up monitoring for email delivery success rates
4. **Backup Service**: Consider having multiple fallback services for critical applications

## API Key Management

### Creating API Keys
```javascript
import { Resend } from 'resend';

const resend = new Resend('re_your_api_key');

// Create a new API key
const apiKey = await resend.apiKeys.create({
  name: 'Virello Food Production',
  permission: 'full_access'
});
```

### Removing API Keys
```javascript
import { Resend } from 'resend';

const resend = new Resend('re_your_api_key');

// Remove an API key by ID
resend.apiKeys.remove('b6d24b8e-af0b-4c3c-be0c-359bbd97381e');
```

### Listing API Keys
```javascript
import { Resend } from 'resend';

const resend = new Resend('re_your_api_key');

// List all API keys
const apiKeys = await resend.apiKeys.list();
```

### Best Practices
1. **Rotate Keys Regularly**: Create new keys and remove old ones periodically
2. **Use Descriptive Names**: Name your keys clearly (e.g., "Virello Food Production", "Virello Food Development")
3. **Minimal Permissions**: Use the least permissions necessary for your use case
4. **Environment Separation**: Use different keys for development, staging, and production
5. **Secure Storage**: Never commit API keys to version control

## Support

- Resend Documentation: https://resend.com/docs
- Resend Support: https://resend.com/support
- API Reference: https://resend.com/docs/api-reference
