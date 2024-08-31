
import { generateNumericOTP } from "../utils/utils.js";
import { RegisterUser, sendMail, verifUserEmail } from "../utils/sendEmail.js";
import { sendToken } from "../utils/sendToken.js";
import { Cachestorage } from "../app.js";
import UserServices from "../operations/UserServices.js";


export const register = async (req, res) => {
  try {
    const { username, email, password, phoneNumber, role } = req.body;

    let user = await UserServices.findUserByEmailOrPhone(email, phoneNumber);

    if (user) {
      if (user.email === email) {
        return res.status(400).json({ success: false, message: "Already have an account, Please Sign in" });
      } else {
        return res.status(400).json({ success: false, message: "Number already Present in our record.." });
      }
    }

    const otp = generateNumericOTP(process.env.OTP_LENGTH);

    user = await UserServices.createUser({
      username,
      email,
      password,
      phoneNumber,
      role,
      otp,
      otp_expiry: new Date(Date.now() + process.env.OTP_EXPIRE * 60 * 1000),
    });


    await sendMail(email, "Verify Your Account - One-Time Password (OTP)", RegisterUser(username, otp));
    Cachestorage.del(['all_user','all_drivers']);

    const finalMessage = "OTP sent to your email, please verify your account"

    sendToken(res, user, 201, finalMessage);

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verify = async (req, res) => {
  try {
    const otp = Number(req.body.otp);
    const userId = req.user._id;

    const user = await UserServices.verifyUserOtp(userId, otp);

    if (user.isVerified) {
      // Send email notification
      await sendMail(
        user.email,
        "Account Verification Successful",
        verifUserEmail(user.username)
      );

      return sendToken(res, user, 200, "Account Verified");
    } else {
      return res.status(400).json({
        success: false,
        message: "Unable to verify user",
      });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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

    const user = await UserServices.findUserByEmailAndVerifyPassword(email,password);

    if(user){
    sendToken(res, user, 200, "Login Successful");
    }else{
      res.status(500).json({ success: false, message: "Error During Login"});
    }
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
    const user = await UserServices.findUserById(req.user._id);

    if(user){
      sendToken(res, user, 201, `Welcome back ${user.username}`);
    }else{
      res.status(500).json({ success: false, message: "Error in showing profile"});
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    Cachestorage.del(['all_user', 'all_drivers']);
    const { name, phoneNo } = req.body;  // Extract name and phoneNo from req.body
    let user;

    // If there's an avatar, update it separately
    if (req.files && req.files.avatar) {
      user = await UserServices.updateUserAvatar(req.user._id, req.files.avatar);
    }

    // Update the user's profile with name and phoneNo
    if(name || phoneNo){
    user = await UserServices.updateUserProfile(req.user._id, name, phoneNo );
    }
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
    
    const user = await UserServices.findUserById(id);


    if (!user) {
      // Handle the case where no user is found
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if(!user.isVerified){
      return res.status(404).json({ success: false, message: "Unauthorized Access" });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    // Catch any unexpected errors
    res.status(500).json({ success: false, message: error.message });
  }
};



