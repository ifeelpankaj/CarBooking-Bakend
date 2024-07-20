import express from "express";
import { driverVerification, getDriverBooking, getMyCabs } from "../controllers/DriverController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.route("/docverify").put(isAuthenticated,driverVerification)

router.route("/getMyCab").get(isAuthenticated,getMyCabs)

router.route("/getDriverBooking").get(isAuthenticated,getDriverBooking)





export default router;