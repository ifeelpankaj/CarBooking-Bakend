import jwt from "jsonwebtoken";
import { User } from "../models/UserModel.js";


export const isAuthenticated = async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res.status(401).json({ success: false, message: "Login First" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded._id) {
      return res.status(401).json({ success: false, message: "Invalid Token" });
    }

    req.user = await User.findById(decoded._id);

    if (!req.user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

