export const sendToken = (res, user, statusCode, message, deletionToken) => {
    const token = user.getJWTToken();
  
    const options = {
      httpOnly: true,
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
    };
  
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role:user.role,
      verified: user.isVerified,
    };
  
    res
      .status(statusCode)
      .cookie("token", token, options)
      .cookie("deletionToken", deletionToken, options) // Set the deletion token as a cookie
      .json({ success: true, message, user: userData });
  };