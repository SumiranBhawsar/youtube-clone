import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Access token missing");
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded?._id).select("-password");

        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }

        req.user = user; // ✅ Attach user to request
        next();
    } catch (err) {
        throw new ApiError(401, err.message || "Invalid access token");
    }
});
