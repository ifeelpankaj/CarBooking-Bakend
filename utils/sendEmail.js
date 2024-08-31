import { createTransport } from "nodemailer";

export const sendMail = async (email, subject, htmlContent, text) => {
  const transport = createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transport.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject,
    text,
    html: htmlContent,
  });
};


export const RegisterUser = (username, otp) => `
  <html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #D6DBDF;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #F1F3C7;
        padding: 20px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #030B40;
        font-size: 24px;
        margin-bottom: 20px;
      }
      p {
        color: #2F0136;
        font-size: 16px;
        line-height: 1.5;
        margin-bottom: 10px;
      }
      .otp {
        background-color: #F92803;
        padding: 10px;
        text-align: center;
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 20px;
      }
      .contact {
        color: #888888;
        font-size: 14px;
        margin-top: 30px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Verify Your Account - One-Time Password (OTP)</h1>
      <p>Dear ${username},</p>
      <p>Thank you for registering with our service. To complete your account verification, please use the following One-Time Password (OTP):</p>
      <div class="otp">${otp}</div>
      <p>Please enter this OTP on the verification page within 5 minutes to verify your account.</p>
      <p>If you did not request this OTP or have any concerns regarding your account, please contact our support team immediately at <a href="mailto:support@example.com">support@example.com</a>.</p>
      <p class="contact">Best regards,<br>Pankaj</p>
    </div>
  </body>
  </html>
`;
export const verifUserEmail = (username) => `<html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #D6DBDF;
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: #F1F3C7 ;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
              }
              h1 {
                color: #501407;
                font-size: 24px;
                margin-bottom: 20px;
              }
              p {
                color: #2F0136;
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 10px;
              }
              .success-message {
                color: #F92803;
                font-weight: bold;
                margin-top: 20px;
              }
              .contact {
                color: #888888;
                font-size: 14px;
                margin-top: 30px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Account Verification Successful</h1>
              <p>Dear ${username},</p>
              <p>Congratulations! Your account has been successfully verified.</p>
              <p>Thank you for choosing our service.</p>
              <p class="success-message">Best regards,<br>Pankaj</p>
              <p class="contact">For any inquiries, please contact us at <a href="mailto:buyyourdesiredbook@gmail.com">buyyourdesiredbook@gmail.com</a>.</p>
            </div>
          </body>
        </html>`;

export const RegisterCabEmail = (modelName) =>`Your Car "${modelName}" has been Registered successfully.`;