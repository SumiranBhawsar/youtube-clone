import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
    // get the channelId from the params
    // check the field is not empty
    // then find the subscription document with the help of channelId
    // if not found then create a new document with the help of channelId and current userId
    // else delete the founded document
    // send response

    const { channelId } = req.params;
    // TODO: toggle subscription

    if (!channelId) {
        throw new ApiError(400, "All fields are required");
    }

    if (channelId === req.user.toString()) {
        throw new ApiError(400, "You cannot subscribe to yourself");
    }

    const subscribedChannel = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user,
    });

    console.log(subscribedChannel);

    if (!subscribedChannel) {
        const createdSubscription = await Subscription.create({
            channel: channelId,
            subscriber: req.user,
        });

        if (!createdSubscription) {
            throw new ApiError(
                500,
                "Server Error while creating the subscription document"
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    createdSubscription,
                },
                "Channel subscribed successfully"
            )
        );
    } else {
        const unSubscribedChannel = await Subscription.findByIdAndDelete(
            subscribedChannel._id
        );

        if (!unSubscribedChannel) {
            throw new ApiError(
                500,
                "Server error while Unsubscribing the channel"
            );
        }

        res.status(200).json(
            new ApiResponse(
                200,
                {
                    unSubscribedChannel,
                },
                "Channel unsubscribed successfully"
            )
        );
    }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // get channels id from the params
    // check  field is not empty
    // find the all subscriber of a channel with the help of aggregation pipeline
    // then send the response

    const { channelId } = req.params;

    if (!channelId) {
        throw new ApiError(400, "All fields are required");
    }

    const allSubscriber = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "allSubscribers",
            },
        },
        {
            $unwind: "$allSubscribers",
        },
        {
            $replaceRoot: {
                newRoot: "$allSubscribers",
            },
        },
        {
            $project: {
                _id: 1,
                username: 1,
                fullName: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
            },
        },
    ]);

    // console.log(allSubscriber);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                allSubscribers: allSubscriber,
            },
            "get all subscriber of a channel successfully"
        )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!subscriberId) {
        throw new ApiError(400, "All fields are required");
    }

    const allChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "allChannels",
            },
        },
        {
            $unwind: "$allChannels",
        },
        {
            $replaceRoot: {
                newRoot: "$allChannels",
            },
        },
        {
            $project: {
                username: 1,
                fullName: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
            },
        },
    ]);

    // console.log(allChannels);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                subscribedChannels: allChannels,
            },
            "get all subscribed channels by user successfully"
        )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
