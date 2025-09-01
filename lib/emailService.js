const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // For development, use Gmail SMTP or a service like Mailtrap
  // You can also use services like SendGrid, Mailgun, etc.
  
  // Option 1: Gmail SMTP (requires app password)
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // Use app password, not regular password
      }
    });
  }
  
  // Option 2: Mailtrap (for testing)
  if (process.env.EMAIL_SERVICE === 'mailtrap') {
    return nodemailer.createTransport({
      host: 'smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS
      }
    });
  }
  
  // Option 3: Custom SMTP
  if (process.env.EMAIL_SERVICE === 'custom') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // Default: Use Gmail with environment variables
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASSWORD || 'your-app-password'
    }
  });
};

// Send verification email
const sendVerificationEmail = async (email, verificationCode) => {
  try {
    console.log('📧 Starting email verification process...');
    console.log('📧 To:', email);
    console.log('🔢 Code:', verificationCode);
    
    const transporter = createTransporter();
    console.log('✅ Transporter created');
    
    const logoUrl = `${process.env.FRONTEND_URL || 'https://virellofoods.store'}/logo.svg`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Virello Food <noreply@virellofoods.store>',
      to: email,
      subject: 'Verify Your Email Address - Virello Food',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${logoUrl}" alt="Virello Food" width="160" height="48" style="display: block; margin: 0 auto 16px; max-width: 100%;">
            <h2 style="color: #333; margin-top: 20px; font-size: 24px;">Verify Your Email Address</h2>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
              Thank you for creating an account with Virello Food! To complete your registration, please verify your email address by entering the verification code below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #007bff; color: white; padding: 20px; border-radius: 10px; font-size: 24px; font-weight: bold; letter-spacing: 5px; display: inline-block;">
                ${verificationCode}
              </div>
            </div>
            
            <p style="color: #555; font-size: 14px; margin-bottom: 20px;">
              This verification code will expire in 10 minutes. If you didn't request this verification, please ignore this email.
            </p>
          </div>
          
          <div style="background-color: #e9ecef; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">How to verify your email:</h3>
            <ol style="color: #555; padding-left: 20px;">
              <li>Copy the verification code above</li>
              <li>Return to the Virello Food website</li>
              <li>Enter the code in the verification field</li>
              <li>Click "Verify Email" to complete your registration</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 12px;">
              If you're having trouble, you can also click the "Resend Code" button on the verification page.
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>This email was sent from Virello Food</p>
            <p>If you have any questions, please contact our support team</p>
          </div>
        </div>
      `,
      text: `
        Verify Your Email Address - Virello Food
        
        Thank you for creating an account with Virello Food! To complete your registration, please verify your email address by entering the verification code below:
        
        Verification Code: ${verificationCode}
        
        This verification code will expire in 10 minutes. If you didn't request this verification, please ignore this email.
        
        How to verify your email:
        1. Copy the verification code above
        2. Return to the Virello Food website
        3. Enter the code in the verification field
        4. Click "Verify Email" to complete your registration
        
        If you're having trouble, you can also click the "Resend Code" button on the verification page.
        
        This email was sent from Virello Food
        If you have any questions, please contact our support team
      `
    };
    
    console.log('📤 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('📧 Response:', info.response);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Error stack:', error.stack);
    return { success: false, error: error.message };
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    
    const logoUrl = `${process.env.FRONTEND_URL || 'https://virellofoods.store'}/logo.svg`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Virello Food <noreply@virellofoods.store>',
      to: email,
      subject: 'Reset Your Password - Virello Food',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${logoUrl}" alt="Virello Food" width="160" height="48" style="display: block; margin: 0 auto 16px; max-width: 100%;">
            <h2 style="color: #333; margin-top: 20px; font-size: 24px;">Reset Your Password</h2>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
              You requested to reset your password for your Virello Food account. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" 
                 style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #555; font-size: 14px; margin-bottom: 20px;">
              This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 12px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; font-size: 12px; word-break: break-all;">
              ${process.env.FRONTEND_URL}/reset-password?token=${resetToken}
            </p>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
          
          <div style="text-align: center; color: #666; font-size: 12px;">
            <p>This email was sent from Virello Food</p>
            <p>If you have any questions, please contact our support team</p>
          </div>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
