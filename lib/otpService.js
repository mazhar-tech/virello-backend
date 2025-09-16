// Free OTP Service for Development
// Email and Console logging only

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Console logging (FREE for development)
const sendOTPToConsole = async (phone, otp) => {
  console.log('\n📱 === OTP VERIFICATION ===');
  console.log(`📞 Phone: ${phone}`);
  console.log(`🔢 OTP Code: ${otp}`);
  console.log(`⏰ Expires: ${new Date(Date.now() + 10 * 60 * 1000).toLocaleString()}`);
  console.log('===========================\n');
  
  return { success: true, method: 'console' };
};

// Email via Nodemailer (FREE with Gmail/Mailtrap)
const sendOTPToEmail = async (email, otp) => {
  try {
    console.log('📧 Sending OTP via email to:', email);
    console.log('📧 Environment check:');
    console.log('  EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'not set');
    console.log('  EMAIL_USER:', process.env.EMAIL_USER ? 'set' : 'not set');
    console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'set' : 'not set');
    console.log('  EMAIL_FROM:', process.env.EMAIL_FROM || 'not set');
    console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
    
    const { sendVerificationEmail } = require('./emailService');
    const result = await sendVerificationEmail(email, otp);
    console.log('📧 Email OTP result:', result);
    return result;
  } catch (error) {
    console.error('❌ Email OTP error:', error.message);
    console.error('❌ Email OTP error stack:', error.stack);
    console.error('❌ Email OTP error code:', error.code);
    console.error('❌ Email OTP error response:', error.response);
    return { success: false, error: error.message };
  }
};

// Main OTP sending function
const sendOTP = async (contact, otp, method = 'console') => {
  console.log(`📤 Sending OTP via ${method} to: ${contact}`);
  
  switch (method) {
    case 'email':
      return await sendOTPToEmail(contact, otp);
    case 'console':
    default:
      return await sendOTPToConsole(contact, otp);
  }
};

module.exports = {
  generateOTP,
  sendOTP,
  sendOTPToConsole,
  sendOTPToEmail
};
