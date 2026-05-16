/**
 * utils/emailService.js
 *
 * Servicio auxiliar para el envío de correos electrónicos desde el backend.
 *
 * Actualmente se utiliza para enviar correos de recuperación de contraseña,
 * generando un enlace temporal hacia el frontend con el token de reseteo.
 *
 * La configuración SMTP se obtiene mediante variables de entorno para evitar
 * incluir credenciales sensibles en el código fuente.
 */
const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create transporter for ProtonMail
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.PROTONMAIL_SMTP_HOST || 'smtp.protonmail.com',
    port: parseInt(process.env.PROTONMAIL_SMTP_PORT || '587', 10),
    secure: false, // Use TLS
    auth: {
      user: process.env.PROTONMAIL_EMAIL,
      pass: process.env.PROTONMAIL_PASSWORD
    },
    tls: {
      rejectUnauthorized: false // For compatibility with ProtonMail
    }
  });
};

/**
 * Send password recovery email
 * @param {string} email - Recipient email
 * @param {string} resetToken - Reset token to include in link
 * @returns {Promise<boolean>} - Success status
 */
async function sendPasswordRecoveryEmail(email, resetToken) {
  try {
    const transporter = createTransporter();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background-color: #f5f5f5;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 20px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #333;
              font-size: 20px;
              margin-top: 0;
              margin-bottom: 16px;
            }
            .content p {
              color: #666;
              font-size: 16px;
              line-height: 1.6;
              margin: 12px 0;
            }
            .reset-button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 12px 32px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 600;
              font-size: 16px;
              margin: 24px 0;
              cursor: pointer;
            }
            .reset-button:hover {
              opacity: 0.9;
              text-decoration: none;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 12px 16px;
              margin: 20px 0;
              border-radius: 4px;
              color: #856404;
              font-size: 14px;
            }
            .footer {
              background-color: #f9f9f9;
              padding: 20px 30px;
              border-top: 1px solid #eee;
              color: #999;
              font-size: 12px;
              text-align: center;
            }
            .footer a {
              color: #667eea;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎬 doublePlay</h1>
              <p>Password Recovery</p>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset your password. Click the button below to set a new password:</p>
              
              <center>
                <a href="${resetLink}" class="reset-button">Reset Password</a>
              </center>

              <div class="warning">
                ⏱️ This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
              </div>

              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #999;">
                ${resetLink}
              </p>

              <p>If you have any trouble, contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2026 doublePlay. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.PROTONMAIL_EMAIL,
      to: email,
      subject: 'Password Recovery - doublePlay',
      html: htmlContent,
      text: `Reset your password: ${resetLink}`
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    logger.error('Error sending recovery email', { email, error: error.message, stack: error.stack });
    return false;
  }
}

module.exports = {
  sendPasswordRecoveryEmail
};
