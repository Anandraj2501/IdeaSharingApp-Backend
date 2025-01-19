import { Router } from "express";
import {verifyToken} from "../controllers/verifyaccesstoken.controller.js";

const router = Router();

router.route("/").post(verifyToken);

export default router;