import { Router } from "express";
import {
    deleteVideo,
    getVideoById,
    publishAVideo,
    togglePublishStatus,
    updateVideo,
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
router.route("/update/:videoId").patch(
    verifyJWT,
    upload.fields([
        {
            name: "newThumbnail",
            maxCount: 1,
        },
    ]),
    updateVideo
);

router.route("/delete/:videoId").delete(verifyJWT, deleteVideo);
router.route("/managePublishStatus/:videoId").patch(verifyJWT, togglePublishStatus);

export default router;
