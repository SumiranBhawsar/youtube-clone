import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { User } from "../models/user.model.js";

const createTweet = asyncHandler(async (req, res) => {
    // get data from the req.body
    // check field is not empty
    // create a tweet document
    // check tweet are created or not
    // send response

    const { content } = req.body;

    if (!content) {
        throw new ApiError(400, "All fields are required");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user,
    });

    const createdTweet = await Tweet.findById(tweet._id);

    // console.log(createdTweet);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                createdTweet,
            },
            "Tweet Created successfully"
        )
    );
});

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    // get user id from the params
    // check field is not empty
    // find user in the user model
    // then apply the aggregation pipeline anf lookup the all tweets created by the user and addfield from the response user

    const { userId } = req.params;

    if (!userId) {
        throw new ApiError(400, "All fileds are required ");
    }

    // const allTweets = await Tweet.aggregate([
    //     {
    //         $match: {
    //             owner: new mongoose.Types.ObjectId(req.user),
    //         },
    //     },
    //     {
    //         $lookup: {
    //             from: "users",
    //             localField: "owner",
    //             foreignField: "_id",
    //             as: "ownerOfAllTweets",
    //         },
    //     },
    //     {
    //         $addFields: {
    //             ownerOfAllTweets: {
    //                 $first: "$ownerOfAllTweets",
    //             },
    //         },
    //     },
    // ]);

    const userWithAllTweets = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user),
            },
        },
        {
            $lookup: {
                from: "tweets",
                localField: "_id",
                foreignField: "owner",
                as: "allTweets",
            },
        },
        {
            $project: {
                username: 1,
                email: 1,
                fullName: 1,
                allTweets: 1,
            },
        },
    ]);

    // console.log(user[0]);

    const allTweets = userWithAllTweets[0];

    res.status(200).json(
        new ApiResponse(
            200,
            {
                userWithAllTweets: allTweets,
            },
            "All tweets are fetched with user successfully"
        )
    );
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    // get tweet id from the req.params
    // get content for update the tweet from req.body
    // check both fields is not empty
    // find tweet by id and update in with new content
    // send response

    const { tweetId } = req.params;
    const { content } = req.body;

    if (!tweetId || !content) {
        throw new ApiError(400, "All fields are required");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: content,
            },
        },
        {
            new: true,
            upsert: false,
        }
    );

    // console.log(updatedTweet);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                updatedTweet,
            },
            "Tweet updated successfully"
        )
    );
});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const { tweetId } = req.params;

    if (!tweetId) {
        throw new ApiError(400, "All fields are required");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                deletedTweet,
            },
            "Tweet deleted successfully"
        )
    );
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
