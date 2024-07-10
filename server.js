import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import cloudinary from "cloudinary";
import { config } from "dotenv";
import Razorpay from "razorpay"

app.get("/", (req, res, next) => {
    res.send("<h1>Welcome Let's Go</h1>");
  });

  config({
    path: "./config/config.env",
  });

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  export const instance = new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY,
    key_secret: process.env.RAZORPAY_API_SECRET,
  });
  

connectDatabase();

app.listen(process.env.PORT, () =>
    console.log(
      `Server is working on PORT: ${process.env.PORT}, in development MODE`
    )
  );