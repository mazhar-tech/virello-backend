// Free OTP Service for Development
// Can be extended with SMS/Email later

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

// SMS via Twilio (PAID)
const sendOTPToSMS = async (phone, otp) => {
  try {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    const message = await client.messages.create({
      body: `Your Virello Food verification code is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    
    console.log('SMS sent:', message.sid);
    return { success: true, method: 'sms', messageId: message.sid };
    
  } catch (error) {
    console.error('SMS error:', error.message);
    return { success: false, error: error.message };
  }
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
    case 'sms':
      return await sendOTPToSMS(contact, otp);
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
  sendOTPToSMS,
  sendOTPToEmail
};
