import fs from "fs";
import { User } from "../models/UserModel.js";
import { sendMail } from "../utils/sendEmail.js";
import { sendToken } from "../utils/sendToken.js";
import cloudinary from "cloudinary";
import { Cachestorage } from "../app.js";


export const register = async (req, res) => {
  try {
    const { username, email, password, phoneNumber, role } = req.body;

    let user = await User.findOne({ $or: [{ email }, { phoneNumber }] });

    if (user) {
      if (user.email === email) {
        return res.status(400).json({ success: false, message: "Already have an account, Please Sign in" });
      } else {
        return res.status(400).json({ success: false, message: "Number already Present in our record.." });
      }
    }
    function generateNumericOTP(length) {
      let digits = '123456789';
      let otp = 0; // Initialize otp as a number

      for (let i = 0; i < length; i++) {
        otp *= 10; // Shift existing digits to the left
        otp += parseInt(digits[Math.floor(Math.random() * digits.length)], 10); // Add new digit as a number
      }

      return otp;
    }


    const otp = generateNumericOTP(process.env.OTP_LENGTH);



    user = await User.create({
      username,
      email,
      password,
      phoneNumber,
      role,
      otp,
      otp_expiry: new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000),
    });


    await sendMail(email, "Verify Your Account - One-Time Password (OTP)",
      `<html>
        <!-- Email content -->
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
              color: 030B40;
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
              text-align:center;
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
            <p>If you did not request this OTP or have any concerns regarding your account, please contact our support team immediately at <a href="mailto:m.attar.plazaa@gmail.com">m.attar.plazaa@gmail.com</a>.</p>
            <p class="contact">Best regards,<br>Pankaj</p>
          </div>
        </body>
      </html>`);
      Cachestorage.del(['all_user','all_drivers']);
    sendToken(
      res,
      user,
      201,
      "OTP sent to your email, please verify your account"
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verify = async (req, res) => {
  try {

    const otp = Number(req.body.otp);


    const user = await User.findById(req.user._id);


    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (user.otp_expiry < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP has been Expired" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otp_expiry = null;

    await user.save();

    // Send email notification
    await sendMail(
      user.email,
      "Account Verification Successful",
      `<html>
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
              <p>Dear ${user.username},</p>
              <p>Congratulations! Your account has been successfully verified.</p>
              <p>Thank you for choosing our service.</p>
              <p class="success-message">Best regards,<br>Pankaj</p>
              <p class="contact">For any inquiries, please contact us at <a href="mailto:buyyourdesiredbook@gmail.com">buyyourdesiredbook@gmail.com</a>.</p>
            </div>
          </body>
        </html>`
    );

    sendToken(res, user, 200, "Account Verified");
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter all fields" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Email or Password" });
    }

    const isMatch = await user.verifyPassword(password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Email or Password" });
    }

    sendToken(res, user, 200, "Login Successful");
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    res
      .status(200)
      .cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
      })
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const myProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    sendToken(res, user, 201, `Welcome back ${user.username}`);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const { name, phoneNumber } = req.body;

    if (name) {
      user.username = name;
    }
    if (phoneNumber) {
      user.phoneNumber = phoneNumber;
    }

    if (req.files && req.files.avatar) {
      const avatar = req.files.avatar;

      // Delete old avatar from cloudinary if it exists
      if (user.avatar && user.avatar.public_id) {
        await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      }

      // Upload new avatar
      const myCloud = await cloudinary.v2.uploader.upload(avatar.tempFilePath, {
        folder: "TandT",
        resource_type: "image",
      });

      // Remove temporary file
      fs.unlinkSync(avatar.tempFilePath);

      user.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    }
    Cachestorage.del(['all_user','all_drivers']);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile Updated",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getProfileById = async (req, res) => {
  try {
    // Extracting ID from request body
    const { id } = req.params;

    // Ensure the ID is provided
    if (!id) {
      return res.status(400).json({ success: false, message: "ID is required" });
    }

    const user = await User.findById(id);

    if (!user) {
      // Handle the case where no user is found
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    // Catch any unexpected errors
    res.status(500).json({ success: false, message: error.message });
  }
};



