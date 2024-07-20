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
      name: user.username,
      email: user.email,
      avatar: user.avatar,
      phoneNo:user.phoneNumber,
      role:user.role,
      verified: user.isVerified,
      documented:user.isDocumentSubmited,
      driver:user.isVerifiedDriver,
      haveCab:user.haveCab,
    };
  
    res
      .status(statusCode)
      .cookie("token", token, options)
      // .cookie("deletionToken", deletionToken, options) 
      .json({ success: true, message, user: userData });
  };