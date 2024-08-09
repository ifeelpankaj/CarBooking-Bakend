import express from "express";
import { cancelBooking, completeBooking, confirmBooking, driverVerification, getDriverBooking, getMyCabs } from "../controllers/DriverController.js";
import { isAuthenticated } from "../middleware/auth.js";

const router = express.Router();

router.route("/docverify").put(isAuthenticated,driverVerification)

router.route("/getMyCab").get(isAuthenticated,getMyCabs)

router.route("/getDriverBooking").get(isAuthenticated,getDriverBooking)

router.route("/confirm-driver-booking").put(isAuthenticated,confirmBooking)

router.route("/cancel-driver-booking").put(isAuthenticated,cancelBooking)

router.route("/complete-driver-booking").put(isAuthenticated,completeBooking)




export default router;