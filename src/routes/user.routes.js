import { Router } from "express";
import {
    changeCurrentUserPassword,
    getCurrentUser,
    getUserChannelProfile,
    getWatchHistory,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUser
);

router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/update-password").patch(verifyJWT, changeCurrentUserPassword);
router.route("/current-user").get(getCurrentUser);
router.route("/update-account-details").patch(verifyJWT, updateAccountDetails);
router.route("/refresh-token").post(verifyJWT, refreshAccessToken);
router
    .route("/update-avatar")
    .patch(verifyJWT, upload.single("avatar"), updateUserAvatar);

router
    .route("/update-cover-image")
    .patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/watchHistory").get(verifyJWT, getWatchHistory);

router.route("/:channelId").get(verifyJWT, getUserChannelProfile);

export default router;
