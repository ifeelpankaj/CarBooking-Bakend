import { User } from "../models/UserModel.js";
import cloudinary from "cloudinary";
import fs from "fs";

class UserService {

  async findUserByEmailOrPhone(email, phoneNumber) {
    try {
      return await User.findOne({ $or: [{ email }, { phoneNumber }] });
    } catch (error) {
      console.error('Error finding user by email or phone:', error);
      throw new Error('Error finding user by email or phone');
    }
  }

  async findUserById(id) {
    try {
      return await User.findById(id);
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw new Error('Error finding user by ID');
    }
  }

  async createUser(userData) {
    try {
      return await User.create(userData);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Error creating user');
    }
  }

  async verifyUserOtp(userId, otp) {
    try {
      const user = await this.findUserById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      if (user.otp !== otp) {
        throw new Error('Invalid OTP');
      }

      if (user.otp_expiry < Date.now()) {
        throw new Error('OTP has expired');
      }

      user.isVerified = true;
      user.otp = null;
      user.otp_expiry = null;

      await user.save();
      return user;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new Error('Error verifying OTP');
    }
  }

  async findUserByEmailAndVerifyPassword(email, password) {
    try {
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        throw new Error('Invalid Email or Password');
      }

      const isMatch = await user.verifyPassword(password);

      if (isMatch) {
        throw new Error('Invalid Email or Password');
      }

      return user;
    } catch (error) {
      console.error('Error verifying email and password:');
      throw new Error('Error verifying email and password');
    }
  }

  async updateUserProfile(userId, updatedName, updatedNo) {
    try {
      const user = await this.findUserById(userId);

      if (!user) {
        throw new Error('DB - User not found');
      }

      // Update username
      if (updatedName) {
        user.username = updatedName;
      }

      // Update phone number
      if (updatedNo) {
        user.phoneNumber = updatedNo;
      }

      await user.save();
      return user;
    } catch (error) {
      console.error('DB - Error updating user profile:', error);
      throw new Error('DB - Services are working slow');
    }
  }

  async updateUserAvatar(userId, avatarData) {
    try {
      const user = await this.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Delete old avatar from cloudinary if it exists
      if (user.avatar && user.avatar.public_id) {
        await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      }

      // Upload new avatar
      const myCloud = await cloudinary.v2.uploader.upload(avatarData.tempFilePath, {
        folder: 'TandT',
        resource_type: 'image',
      });

      // Remove temporary file
      fs.unlinkSync(avatarData.tempFilePath);

      user.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };

      await user.save();
      return user;
    } catch (error) {
      console.error('Error updating user avatar:', error);
      throw new Error('Error updating user avatar');
    }
  }

  
}



export default new UserService();

