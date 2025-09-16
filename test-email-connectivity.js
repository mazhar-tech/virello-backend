const nodemailer = require('nodemailer');

// Test email connectivity
const testEmailConnectivity = async () => {
  console.log('🧪 Testing email service connectivity...');
  
  try {
    // Create transporter with same config as production
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      pool: false,
      maxConnections: 1,
      maxMessages: 1,
      secure: true,
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      }
    });

    console.log('📡 Testing connection...');
    
    // Test connection
    await transporter.verify();
    console.log('✅ Email service connection successful!');
    
    // Test sending a simple email
    const testMailOptions = {
      from: process.env.EMAIL_FROM || 'Virello Food <noreply@virellofoods.com>',
      to: process.env.EMAIL_USER, // Send to self for testing
      subject: 'Email Service Test - Virello Food',
      text: 'This is a test email to verify the email service is working correctly.',
      html: '<p>This is a test email to verify the email service is working correctly.</p>'
    };

    console.log('📤 Sending test email...');
    const info = await transporter.sendMail(testMailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    
    transporter.close();
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Email service test failed:', error.message);
    console.error('❌ Error details:', error);
    return { success: false, error: error.message };
  }
};

// Run the test
testEmailConnectivity()
  .then(result => {
    console.log('\n📊 Test Results:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
