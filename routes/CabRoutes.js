import express from "express";

import { isAuthenticated } from "../middleware/auth.js";
import { calculateDistance, deleteCab, getAllCabs, getCab, getCabWithUpcomingBookings, getDriverCabs, registerCab, updateCab } from "../controllers/CabController.js";


const router = express.Router();

// cab route

router.route("/registration").post(isAuthenticated,registerCab);

router.route("/updateCab/:id").put(isAuthenticated,updateCab);

router.route("/getCabs").get(isAuthenticated,getAllCabs);

router.route("/getCabs/:id").get(isAuthenticated,getCab);

router.route("/getRide").get(isAuthenticated,getDriverCabs);

router.route("/getRide/:id").delete(isAuthenticated,deleteCab);

router.route("/calculate-distance").get(isAuthenticated,calculateDistance);

router.route("/get-upcomming-booking/:cabId").get(isAuthenticated,getCabWithUpcomingBookings);









export default router;
