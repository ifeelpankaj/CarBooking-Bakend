import express from "express";
import { bookCab, getMyBookings, getOrderDetail, paymentVerification } from "../controllers/OrderController.js";
import { isAuthenticated } from "../middleware/auth.js";



const router = express.Router();

router.route("/checkout").post(isAuthenticated,bookCab);

router.route("/paymentVerification").post(isAuthenticated,paymentVerification);

router.route("/mybooking").get(isAuthenticated, getMyBookings);

router.route("/mybooking/:id").get(isAuthenticated, getOrderDetail);


export default router;
