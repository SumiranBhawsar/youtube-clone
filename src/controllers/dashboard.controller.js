import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const channelId = req.user;

    if (!channelId) {
        throw new ApiError(400, "All fields are required");
    }

    const channelObjectId = new mongoose.Types.ObjectId(channelId);

    const totalViewsResult = await Video.aggregate([
        {
            $match: {
                VideoCreater: channelObjectId,
            },
        },
        {
            $group: {
                _id: null,
                totalViews: {
                    $sum: "$views",
                },
            },
        },
    ]);
    const totalViews = totalViewsResult[0]?.totalViews || 0;

    const totalSubscribers = await Subscription.countDocuments({
        channel: channelObjectId,
    });

    const totalVideos = await Video.countDocuments({
        VideoCreater: channelObjectId,
    });

    const totalLikesResult = await Video.aggregate([
        {
            $match: {
                VideoCreater: channelObjectId,
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likedVideos",
            },
        },
        {
            $unwind: "$likedVideos",
        },
        {
            $replaceRoot: {
                newRoot: "$likedVideos",
            },
        },
        {
            $group: {
                _id: null,
                totalLike: {
                    $sum: 1,
                },
            },
        },
    ]);

    // console.log(likedVideos);
    const totalLikes = totalLikesResult[0]?.totalLike || 0;
    // console.log(totalLikes);

    res.status(200).json(
        new ApiResponse(200, {
            totalVideoViews: totalViews,
            totalChannelSubscribers: totalSubscribers,
            totalChannelVideos: totalVideos,
            totalChannelLikes: totalLikes,
        })
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    // get the channel id from the req.user
    // check if not empty
    // find all the videos with the help of aggregation pipeline
    // send response

    const channelId = req.user;

    // console.log(channelId);

    if (!channelId) {
        throw new ApiError(400, "All fields are required");
    }

    const allVideos = await Video.aggregate([
        {
            $match: {
                VideoCreater: new mongoose.Types.ObjectId(channelId),
            },
        },
    ]);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                allVideos,
            },
            "All video uploaded by channel is fetched successfully"
        )
    );
});

export { getChannelStats, getChannelVideos };
