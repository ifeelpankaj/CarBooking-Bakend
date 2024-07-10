import express from "express";
import { bookCab, paymentVerification } from "../controllers/OrderController.js";
import { isAuthenticated } from "../middleware/auth.js";



const router = express.Router();

router.route("/checkout").post(isAuthenticated,bookCab);

router.route("/paymentVerification").post(isAuthenticated,paymentVerification);


export default router;
