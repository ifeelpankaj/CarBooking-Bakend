import express from "express";
import { allCabs, setRateForCab } from "../controllers/AdminController.js";
import { isAuthenticated } from "../middleware/auth.js";



const router = express.Router();

//Admin Route

router.route("/setRate/:id").post(isAuthenticated,setRateForCab);

router.route("/all-cabs").get(isAuthenticated,allCabs);






export default router;