import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import { extractPublicIdFromURL } from "../utils/extractPublicIdFromURL.js";
import { destroyOnCloudinary } from "../utils/cloudinary_destroy.js";

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
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const { email, username, password } = req.body;
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")

    // }

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

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged In Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user,
        {
            $set: {
                refreshToken: "", // this removes the field from document
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
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

        const option = {
            httpOnly: true,
            secure: true,
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
    // Get the current user from the request
    const loggendInUser = req.user;

    const currentUse = await User.findById(loggendInUser._id).select(
        "-password -refreshToken"
    );

    if (!currentUse) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json(
        new ApiResponse(200, currentUse, "Current user fetched successfully")
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
};
