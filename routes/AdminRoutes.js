import express from "express";
import { allBookings, allCabs, allDrivers, allUser, getAvailableCabs, getCabById, getDriverInfoById, getUserById, setRateForCab, updateBookedCab, verifyDriver } from "../controllers/AdminController.js";
import { isAuthenticated } from "../middleware/auth.js";



const router = express.Router();

//Admin Route

router.route("/setRate/:id").post(isAuthenticated, setRateForCab);

router.route("/all-cabs").get(isAuthenticated, allCabs);

router.route("/all-users").get(isAuthenticated, allUser);

router.route("/all-bookings").get(isAuthenticated, allBookings);

router.route("/all-drivers").get(isAuthenticated, allDrivers);

router.route("/assign-cab/:id").patch(isAuthenticated, updateBookedCab);

router.route("/admin-user/:id").get(isAuthenticated, getUserById);

router.route("/admin-avaliable-cab").post(isAuthenticated, getAvailableCabs);

router.route("/admin-cab-ById/:id").get(isAuthenticated, getCabById);

router.route("/admin-driver-ById/:id").get(isAuthenticated, getDriverInfoById);

router.route("/admin-verify-driver/:id").put(isAuthenticated, verifyDriver);

export default router;