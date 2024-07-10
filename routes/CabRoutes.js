import express from "express";

import { isAuthenticated } from "../middleware/auth.js";
import { getAllCabs, getCab, registerCab, updateCab } from "../controllers/CabController.js";


const router = express.Router();

// cab route

router.route("/registration").post(isAuthenticated,registerCab);

router.route("/updateCab/:id").put(isAuthenticated,updateCab);

router.route("/getCabs").get(isAuthenticated,getAllCabs);

router.route("/getCabs/:id").get(isAuthenticated,getCab);





export default router;
