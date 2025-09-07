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
    const { sendVerificationEmail } = require('./emailService');
    const result = await sendVerificationEmail(email, otp);
    console.log('📧 Email OTP result:', result);
    return result;
  } catch (error) {
    console.error('❌ Email OTP error:', error.message);
    console.error('❌ Email OTP error stack:', error.stack);
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
