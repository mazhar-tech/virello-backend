require('dotenv').config();
const { testResendConnection, sendEmailWithResend } = require('./lib/emailService');

async function testResend() {
  console.log('🧪 Testing Resend Email Service Integration');
  console.log('==========================================');
  
  // Check environment variables
  console.log('\n📋 Environment Check:');
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL || 'Using default');
  
  if (!process.env.RESEND_API_KEY) {
    console.log('\n❌ RESEND_API_KEY is not set. Please add it to your .env file.');
    console.log('Get your API key from: https://resend.com/api-keys');
    return;
  }
  
  // Test connection
  console.log('\n🔍 Testing Resend Connection...');
  const connectionTest = await testResendConnection();
  
  if (connectionTest.success) {
    console.log('✅ Resend connection test passed!');
  } else {
    console.log('❌ Resend connection test failed:', connectionTest.error);
  }
  
  // Test sending a real email (optional - uncomment to test)
  /*
  console.log('\n📧 Testing Email Sending...');
  const testEmail = 'your-test-email@example.com'; // Replace with your email
  
  const emailTest = await sendEmailWithResend(
    testEmail,
    'Test Email from Virello Food',
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Test Email</h2>
        <p>This is a test email sent via Resend service.</p>
        <p>If you receive this email, the Resend integration is working correctly!</p>
      </div>
    `,
    'Test Email\n\nThis is a test email sent via Resend service.\n\nIf you receive this email, the Resend integration is working correctly!'
  );
  
  if (emailTest.success) {
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', emailTest.messageId);
  } else {
    console.log('❌ Test email failed:', emailTest.error);
  }
  */
  
  console.log('\n🎉 Resend integration test completed!');
}

testResend().catch(console.error);
