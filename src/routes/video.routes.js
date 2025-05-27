import { Router } from "express";
import {
    getVideoById,
    publishAVideo,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/upload").post(
    upload.fields([
        {
            name: "thumbnail",
            maxCount: 1,
        },
        {
            name: "videoFile",
            maxCount: 1,
        },
    ]),
    verifyJWT,
    publishAVideo
);

router.route("/:id").get(verifyJWT, getVideoById);

export default router;
