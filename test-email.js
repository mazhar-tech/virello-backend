const nodemailer = require('nodemailer');
require('dotenv').config();

// Test email configuration
const testEmail = async () => {
  console.log('🧪 Testing Email Configuration...');
  console.log('📧 EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
  console.log('📧 EMAIL_USER:', process.env.EMAIL_USER);
  console.log('📧 EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('📧 OTP_METHOD:', process.env.OTP_METHOD);
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    console.log('✅ Transporter created successfully');
    
    // Test connection
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    // Send test email
    const testEmailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: 'Virello Food - Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Email Test Successful!</h2>
          <p>This is a test email from Virello Food backend.</p>
          <p>If you receive this email, your SMTP configuration is working correctly.</p>
          <p><strong>Test Code:</strong> 123456</p>
          <p>Time: ${new Date().toLocaleString()}</p>
        </div>
      `,
      text: `
        Email Test Successful!
        
        This is a test email from Virello Food backend.
        If you receive this email, your SMTP configuration is working correctly.
        
        Test Code: 123456
        Time: ${new Date().toLocaleString()}
      `
    };
    
    const info = await transporter.sendMail(testEmailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('❌ Error details:', error);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Gmail Authentication Error Solutions:');
      console.log('1. Make sure you\'re using an App Password, not your regular Gmail password');
      console.log('2. Enable 2-Factor Authentication on your Gmail account');
      console.log('3. Generate a new App Password: https://myaccount.google.com/apppasswords');
      console.log('4. Make sure "Less secure app access" is enabled (if not using App Password)');
    }
    
    if (error.code === 'ECONNECTION') {
      console.log('\n💡 Connection Error Solutions:');
      console.log('1. Check your internet connection');
      console.log('2. Verify SMTP settings');
      console.log('3. Check firewall settings');
    }
  }
};

// Run the test
testEmail();
