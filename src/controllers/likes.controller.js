import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const toggleVideoLike = asyncHandler(async (req, res) => {
    // get videoId from the params
    // check the videoId field is not empty
    // find the like in database with the help of videoId and current userId
    // if find then delete the like document
    // else create the new document
    // send the response

    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "All fields are required");
    }

    const foundedLike = await Like.findOne({
        $and: [
            {
                likedBy: req.user,
            },
            {
                video: videoId,
            },
        ],
    });

    if (!foundedLike) {
        const like = await Like.create({
            video: videoId,
            likedBy: req.user,
        });

        const createdLike = await Like.findById(like._id);

        if (!createdLike) {
            throw new ApiError(
                500,
                "Something went wrong while registering the user"
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    createdLike,
                },
                "video liked successfully"
            )
        );
    } else {
        const deletedLike = await Like.findByIdAndDelete(foundedLike._id);

        if (!deletedLike) {
            throw new ApiError(
                500,
                "something went wrong while delete the Like "
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    deletedLike,
                },
                "unlike the video successfully"
            )
        );
    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    // get comment id from the params
    // check id isNot empty
    // find the comment like in the database
    // if not find then create a like
    // else delete the comment like
    // send response

    const { commentId } = req.params;
    //TODO: toggle like on comment

    if (!commentId) {
        throw new ApiError(400, "All fields are required");
    }

    const foundedComment = await Like.findOne({
        $and: [
            {
                comment: commentId,
            },
            {
                likedBy: req.user,
            },
        ],
    });

    if (!foundedComment) {
        const createdComment = await Like.create({
            comment: commentId,
            likedBy: req.user,
        });

        if (!createdComment) {
            throw new ApiError(
                500,
                "server error while creating the the commentLike "
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    createdComment,
                },
                "comment liked successfully"
            )
        );
    } else {
        const deletedComment = await Like.findByIdAndDelete(foundedComment._id);

        if (!deletedComment) {
            throw new ApiError(
                500,
                "server error while deleting the commentLike "
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    deletedComment,
                },
                "unlike comment successfully"
            )
        );
    }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    // get tweet id from the params
    // check is not empty
    // find the like in the database with the help of current user and tweet id
    // if not then create a tweetLike
    // else delete the tweet like
    // send response

    const { tweetId } = req.params;
    //TODO: toggle like on tweet

    if (!tweetId) {
        throw new ApiError(400, "All fields are required");
    }

    const foundedTweet = await Like.findOne({
        likedBy: req.user,
        tweet: tweetId,
    });

    // console.log(foundedTweet);

    if (!foundedTweet) {
        const createdTweet = await Like.create({
            likedBy: req.user,
            tweet: tweetId,
        });

        if (!createdTweet) {
            throw new ApiError(
                500,
                "server error while creating the TweetLike"
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    createdTweet,
                },
                "Tweet liked successfully"
            )
        );
    } else {
        const deletedTweet = await Like.findByIdAndDelete(foundedTweet._id);

        if (!deletedTweet) {
            throw new ApiError(
                500,
                "Server error while deleting the tweetLike "
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    deletedTweet,
                },
                "Unlike Tweet successfully"
            )
        );
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    // find all likedVideo with the help of current user
    // and use aggregation
    // send response

    const currentUser = new mongoose.Types.ObjectId(req.user);

    const allLikedVideo = await Like.aggregate([
        {
            $match: {
                likedBy: currentUser,
                video: { $exists: true, $ne: null },
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "AllLikedVideo",
            },
        },
        {
            $unwind: "$AllLikedVideo",
        },
        {
            $replaceRoot: {
                newRoot: "$AllLikedVideo",
            },
        },
    ]);

    // console.log(allLiked);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                allLikedVideos: allLikedVideo,
            },
            "Get All Liked Video Successfully"
        )
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
