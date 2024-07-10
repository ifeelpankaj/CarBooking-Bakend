import express from "express";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import NodeCache from "node-cache";
import cors from 'cors';
export const Cachestorage = new NodeCache();



const app = express();


app.use(express.json({ limit: "50mb" }));
const allowedOrigins = ['http://localhost:5173', 'https://your-production-frontend.com'];

app.use(cors({
  origin: function(origin, callback) {
    if(!origin) return callback(null, true);
    if(allowedOrigins.indexOf(origin) === -1){
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
app.use(
  fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 },
    useTempFiles: true,
  })
);


import userRoute from './routes/UserRoutes.js';
import cabRoute from './routes/CabRoutes.js';
import adminRoute from './routes/AdminRoutes.js';
import orderRoute from './routes/OrderRoute.js';




app.use("/api/v1/user", userRoute);
app.use("/api/v1/cab", cabRoute);
app.use("/api/v1/order", orderRoute);
app.use("/admin/v1", adminRoute);




export default app;

