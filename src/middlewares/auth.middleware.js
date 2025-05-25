import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    // get jwt token from cookie or header
    // check if token present or ton
    // verify token is valid
    // if valid then find user from database with the help of token data
    // if user found then attach user to req object
    // next()

    try {
        const token =
            req.cookies?.accessToken ||
            req.header("authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorized");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            throw new ApiError(401, "Unauthorized");
        }

        req.user = user._id;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid access token");
    }
});
