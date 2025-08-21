import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { extractPublicIdFromURL } from "../utils/extractPublicIdFromURL.js";
import { destroyOnCloudinary } from "../utils/cloudinary_destroy.js";
import mongoose from "mongoose";
import { Video } from "../models/video.model.js";

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating referesh and access token"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { fullName, email, username, password } = req.body;
    //console.log("email: ", email);

    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered Successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true on Render
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // required for cross-site cookies
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user,
        {
            $unset: {
                refreshToken: 1,
            },
        },
        {
            new: true,
        }
    );

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true on Render
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // required for cross-site cookies
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken || req.body.refreshToken;

    if (!token) {
        throw new ApiError(401, "Token is not available");
    }

    try {
        const decodedToken = jwt.verify(
            token,
            process.env.REFRESH_TOKEN_SECRET
        );

        if (!decodedToken) {
            throw new ApiError(401, "unauthorized refresh token");
        }

        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new ApiError(401, "refresh token is expired");
        }

        if (token !== user?.refreshToken) {
            throw new ApiError("your refresh token is invalid");
        }

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefereshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // true only in production
            sameSite: "strict", // prevents CSRF
        };

        res.status(200)
            .cookie("accessToken", accessToken, option)
            .cookie("refreshToken", newRefreshToken, option)
            .json(
                new ApiResponse(
                    201,
                    {
                        accessToken,
                        refreshToken: newRefreshToken,
                    },
                    "Access Token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

const changeCurrentUserPassword = asyncHandler(async (req, res) => {
    // get data from req body
    // check if new password or confirm password is equal
    // find user from database
    // check if old password is correct
    // update password and save in database
    // return response

    // const { oldPassword, newPassword, confirmPassword } = req.body;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    console.log(oldPassword, newPassword, confirmPassword);

    if (!oldPassword || !newPassword || !confirmPassword) {
        throw new ApiError(400, "All fields are required");
    }

    if (newPassword !== confirmPassword) {
        throw new ApiError(
            400,
            "New password and confirm password do not match"
        );
    }

    const user = await User.findById(req.user._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Old password is incorrect");
    }

    user.password = newPassword;

    const response = await user.save({ validateBeforeSave: false });

    console.log(response);

    res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
    const currentUser = await User.findById(req.user._id).select(
        "-password -refreshToken"
    );

    if (!currentUser) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json(
        new ApiResponse(200, currentUser, "Current user fetched successfully")
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    // get details from req body like {fullName and email}
    // check if fullName and email are not empty
    // get user from req.user
    // find in the database by id and update the user details
    // remove password and refresh token from response
    // return response

    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "Full name and email are required");
    }

    const authenticatedUser = req.user;

    const updatedUser = await User.findByIdAndUpdate(
        authenticatedUser._id,
        {
            $set: {
                fullName,
                email,
            },
        },
        {
            new: true,
        }
    ).select("-password -refreshToken");

    if (!updatedUser) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json(
        new ApiResponse(
            200,
            updatedUser,
            "User account details updated successfully"
        )
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    // get avatar file from req.files
    // check if avatar file is present
    // upload avatar file to cloudinary
    // update user avatar in database
    // remove password and refresh token from response
    // return response
    const avatarLocalPath = req.file?.path;

    // console.log("Avatar Local Path: ", avatarLocalPath);

    // console.log(req.file?.path);

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.findById(req.user._id);

    // console.log("User: ", user);

    const publicId = await extractPublicIdFromURL(user.avatar);

    // console.log(publicId);

    const response = await destroyOnCloudinary(publicId);

    // console.log(response);

    const updatedAvatar = await uploadOnCloudinary(avatarLocalPath);

    // console.log("Updated Avatar: ", updatedAvatar);

    if (!updatedAvatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const authenticatedUser = req.user;

    const updatedAvatarUser = await User.findByIdAndUpdate(
        authenticatedUser._id,
        {
            $set: {
                avatar: updatedAvatar.url,
            },
        },
        {
            new: true,
        }
    ).select("-password -refreshToken");

    // console.log("Updated Avatar User: ", updatedAvatarUser);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                updatedAvatarUser,
                response,
            },
            "User avatar updated successfully"
        )
    );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // get coverImage file from req.files
    // check if coverImage file is present
    // upload coverImage file to cloudinary
    // update user coverImage in database
    // remove password and refresh token from response
    // return response

    const coverImageLocalPath = req.file?.path;

    // console.log("Cover Image Local Path: ", coverImage);

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is required");
    }

    const user = await User.findById(req.user._id);

    const publicId = await extractPublicIdFromURL(user.coverImage);

    const response = await destroyOnCloudinary(publicId);

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage) {
        throw new ApiError(400, "Cover image file is required");
    }

    const authenticatedUser = req.user;

    const updatedCoverImageUser = await User.findByIdAndUpdate(
        authenticatedUser._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        {
            new: true,
        }
    ).select("-password -refreshToken");

    if (!updatedCoverImageUser) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json(
        new ApiResponse(
            200,
            {
                updatedCoverImageUser,
                response,
            },
            "User cover image updated successfully"
        )
    );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId?.trim()) {
        throw new ApiError(400, "channelId is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "VideoCreater", // make sure this matches your Video model field name
                as: "videos",
            },
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                channelsSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
                totalVideos: { $size: "$videos" },
                totalViews: { $sum: "$videos.views" },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                totalVideos: 1,
                totalViews: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User channel fetched successfully"
            )
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    // const requestedUser = req.user._id;
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    // console.log(user);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { watchHistory: user[0]?.watchHistory },
                "User watch history fetched successfully"
            )
        );
});

const searchUsers = asyncHandler(async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim() === "") {
            return res
                .status(400)
                .json({ message: "Query parameter is required" });
        }

        const users = await User.find({
            $or: [
                { username: { $regex: query, $options: "i" } },
                { fullName: { $regex: query, $options: "i" } },
            ],
        }).select("username fullName email avatar");

        res.json({ results: users });
    } catch (error) {
        console.error("Error in searchUsers:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
        });
    }
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentUserPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    searchUsers,
};
