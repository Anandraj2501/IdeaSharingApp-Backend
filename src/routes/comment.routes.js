import { Router } from "express";
import {addComment, getComments} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();
router.use(verifyJWT);


router.route("/getComment/:id").get(getComments);
router.route("/addComment").post(addComment);

export default router;