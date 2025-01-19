import { Router } from "express";
import { addIdea, deleteIdea, getIdea, updateIdea, updateIdeaStatus, getUserIdeas, getIdeaStatistics,getIdeasByStatus,updateIdeaState,getIdeasByState,likeIdea,getTopIdea,getIdeaById} from "../controllers/idea.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middlewares.js";

const router = Router();
router.use(verifyJWT);

router.route("/create").post(upload.array("postImages",10), addIdea);
router.route("/getIdeas").get(getUserIdeas);
router.route("/getIdeaById/:id").get(getIdeaById);
router.route("/getTopIdea").get(getTopIdea);
router.route("/update/:id").put(upload.array("postImages", 10), updateIdea);
router.route("/updateState/:id").put(updateIdeaState);
router.route("/getIdeaByState").get(getIdeasByState);
router.route("/delete/:id").delete(deleteIdea);
router.route("/like/:id").put(likeIdea);



router.route("/updatestatus/:id").put(verifyAdmin,updateIdeaStatus);
router.route("/get").get(verifyAdmin,getIdea);
router.route("/getIdeaStatistics").get(verifyAdmin,getIdeaStatistics);
router.route("/getIdeasByStatus").get(verifyAdmin,getIdeasByStatus);


export default router;