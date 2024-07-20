import express from "express";
import {  getProfileById, login, logout, myProfile, register, updateProfile, verify } from "../controllers/UserController.js";
import { isAuthenticated } from "../middleware/auth.js";


const router = express.Router();

//user routes

router.route("/register").post(register);

router.route("/verify").post(isAuthenticated, verify);

router.route("/login").post(login);

router.route("/logout").get(logout);

router.route("/modify").put(isAuthenticated, updateProfile);

router.route("/me").get(isAuthenticated, myProfile);

router.route("/userById/:id").get(isAuthenticated, getProfileById);









export default router;
