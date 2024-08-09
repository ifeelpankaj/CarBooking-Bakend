import mongoose from 'mongoose';
import argon2 from "argon2";
import jwt from "jsonwebtoken";



const userSchema = new mongoose.Schema({

    username: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    phoneNumber: {
        type: Number,
        required: true,
        unique: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    isVerifiedDriver: {
        type: Boolean,
        default: false,
    },
    isDocumentSubmited:{
        type:Boolean,
        default:false,
    },
    driverDocuments: [{
        docName: String,
        public_id: String,
        url: String,
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    }],
    haveCab:{
        type:Boolean,
        default:false,
    },

    avatar: {
        public_id: String,
        url: String,
    },

    role: {
        type: String,
        enum: ["Passenger", "Driver", "Admin"],
        default: "Passenger",
    },
    otp: Number,
    otp_expiry: Date,
    resetPasswordOtp: Number,
    resetPasswordOtpExpiry: Date,
    
    createdAt: {
        type: Date,
        default: Date.now,
    },  
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        this.password = await argon2.hash(this.password);
    } catch (err) {
        console.error(err);
        next(err);
    }
    next();
});
userSchema.methods.getJWTToken = function () {
    return jwt.sign({ _id: this._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000,
    });
  };

// Method to compare password
userSchema.methods.verifyPassword = async function (plainTextPassword) {
    try {
        return await argon2.verify(this.password, plainTextPassword);
    } catch (err) {
        console.error(err);
        return false;
    }
};

userSchema.index({ otp_expiry: 1 }, { expireAfterSeconds: 0 });

export const User = mongoose.model("User", userSchema);