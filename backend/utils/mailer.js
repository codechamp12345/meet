const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

//  6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};


const sendOTPEmail = async (email, otp, name) => {
    const mailOptions = {
        from: `"SyncRoom" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your SyncRoom Account',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #1a1a2e; color: #fff; }
          .container { max-width: 500px; margin: 0 auto; padding: 40px 20px; }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #a855f7; margin: 0; font-size: 32px; }
          .card { background: #16213e; border-radius: 16px; padding: 40px; text-align: center; }
          .otp-box { background: linear-gradient(135deg, #a855f7, #ec4899); padding: 20px 40px; border-radius: 12px; display: inline-block; margin: 20px 0; }
          .otp { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #fff; margin: 0; }
          .message { color: #94a3b8; line-height: 1.6; }
          .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>🎥 SyncRoom</h1>
          </div>
          <div class="card">
            <h2 style="margin-top: 0;">Hello ${name}! 👋</h2>
            <p class="message">Use the verification code below to complete your registration:</p>
            <div class="otp-box">
              <p class="otp">${otp}</p>
            </div>
            <p class="message">This code expires in <strong>10 minutes</strong>.</p>
            <p class="message" style="font-size: 13px;">If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2024 Therayu. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true };
    } catch (error) {
        console.error('Email send error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = { generateOTP, sendOTPEmail };
