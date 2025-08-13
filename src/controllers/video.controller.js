import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";

// const getAllVideos = asyncHandler(async (req, res) => {
//     let {
//         page = 1,
//         limit = 12,
//         query = "",
//         sortBy = "createdAt",
//         sortType = "desc",
//     } = req.query;

//     // Parse integers
//     page = parseInt(page);
//     limit = parseInt(limit);

//     if (!query) {
//         throw new ApiError(401, "All fields are required");
//     }

//     // Match conditions
//     const match = {
//         // VideoCreater: new mongoose.Types.ObjectId(userId),
//         $or: [
//             { title: { $regex: query, $options: "i" } },
//             { description: { $regex: query, $options: "i" } },
//         ],
//     };

//     // Sorting
//     const sortDirection = sortType === "asc" ? 1 : -1;
//     const sort = { [sortBy]: sortDirection };

//     // Aggregation pipeline
//     const aggregate = Video.aggregate([{ $match: match }, { $sort: sort }]);

//     // Pagination options
//     const options = {
//         page,
//         limit,
//     };

//     // Apply pagination on aggregation
//     const allVideosAccordingToQuery = await Video.aggregatePaginate(
//         aggregate,
//         options
//     );

//     // Send response
//     res.status(200).json(
//         new ApiResponse(
//             200,
//             {
//                 allVideosAccordingToQuery,
//             },
//             "All Videos are fetched successfully"
//         )
//     );
// });

// video.controller.js
const getAllVideos = asyncHandler(async (req, res) => {
    let {
        page = 1,
        limit = 12,
        query = "", // Allow empty query
        sortBy = "createdAt",
        sortType = "desc",
    } = req.query;

    // Parse integers
    page = parseInt(page);
    limit = parseInt(limit);

    // Match conditions
    const match = query
        ? {
              $or: [
                  { title: { $regex: query, $options: "i" } },
                  { description: { $regex: query, $options: "i" } },
              ],
          }
        : {}; // Empty match to fetch all videos

    // Sorting
    const sortDirection = sortType === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortDirection };

    // Aggregation pipeline
    const aggregate = Video.aggregate([
        // Stage 1: Match videos based on query, userId, and published status
        {
            $match: match,
        },
        // Stage 2: Lookup owner information from the 'users' collection
        {
            $lookup: {
                from: "users",
                localField: "VideoCreater",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullName: 1,
                        },
                    },
                ],
            },
        },
        // Stage 3: Deconstruct the ownerDetails array to a single object
        {
            $addFields: {
                owner: {
                    $first: "$ownerDetails",
                },
            },
        },
        // Stage 4: Remove the now-redundant ownerDetails array
        {
            $project: {
                ownerDetails: 0,
            },
        },
        // Stage 5: Sort the results
        {
            $sort: sort,
        },
    ]);
    // Pagination options
    const options = {
        page,
        limit,
    };

    // Apply pagination on aggregation
    const allVideosAccordingToQuery = await Video.aggregatePaginate(
        aggregate,
        options
    );

    //console.log("allVideosAccordingToQuery", allVideosAccordingToQuery);

    // Send response
    res.status(200).json(
        new ApiResponse(
            200,
            { allVideosAccordingToQuery },
            "All Videos are fetched successfully"
        )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    const thambnailLocalPath = req.files?.thumbnail[0]?.path;
    const videoFileLocalPath = req.files?.videoFile[0]?.path;

    if (!thambnailLocalPath || !videoFileLocalPath) {
        throw new ApiError(400, "Thumbnail and video file are required");
    }

    const thambnail = await uploadOnCloudinary(thambnailLocalPath);
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);

    console.log(videoFile);

    if (!thambnail || !videoFile) {
        throw new ApiError(400, "Thumbnail and video file are required");
    }

    console.log(req.user);

    const video = await Video.create({
        title,
        description,
        thumbnail: thambnail.url,
        videoFile: videoFile.url,
        VideoCreater: req.user, // push the current user id who created the video
        duration: videoFile.duration, // assuming videoFile has a duration property
    });

    console.log(video);

    const uploadedVideo = await Video.findById(video._id);

    if (!uploadedVideo) {
        throw new ApiError(500, "Video creation failed");
    }

    res.status(201).json(
        new ApiResponse(201, "Video uploaded successfully", uploadedVideo)
    );
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id; // Get the logged-in user's ID, if they exist

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // Add video to the current user's watch history
    if (userId) {
        await User.findByIdAndUpdate(userId, {
            $addToSet: { watchHistory: videoId },
        });
    }

    const video = await Video.aggregate([
        // Stage 1: Match the requested video and increment its views
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $set: { views: { $add: ["$views", 1] } },
        },
        // Stage 2: Get owner (channel) details from the users collection
        {
            $lookup: {
                from: "users",
                localField: "VideoCreater", // Corrected from your file: 'owner' is often used, but yours is 'VideoCreater'
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        // Stage 3: Get the number of likes for this video
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        // Stage 4: Get the subscriber count for the channel (video owner)
        {
            $lookup: {
                from: "subscriptions",
                localField: "VideoCreater",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        // Stage 5: Add final fields for easier frontend use
        {
            $addFields: {
                // Deconstruct the owner array to be a single object
                owner: { $first: "$owner" },
                // Get a total count of likes
                likesCount: { $size: "$likes" },
                // Get a total count of subscribers
                subscribersCount: { $size: "$subscribers" },
                // Check if the current logged-in user has liked this video
                isLiked: {
                    $cond: {
                        if: { $in: [userId, "$likes.likedBy"] },
                        then: true,
                        else: false,
                    },
                },
                // Check if the current logged-in user is subscribed to this channel
                isSubscribed: {
                    $cond: {
                        if: { $in: [userId, "$subscribers.subscriber"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        // Stage 6: Clean up the response by removing temporary fields
        {
            $project: {
                likes: 0,
                subscribers: 0,
            },
        },
    ]);

    console.log("Video : ", video);

    if (!video?.length) {
        throw new ApiError(404, "Video not found");
    }

    // Increment the view count in the actual document
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    // Send the rich video data object
    res.status(200).json(
        new ApiResponse(200, video[0], "Video details fetched successfully")
    );
});

const updateVideo = asyncHandler(async (req, res) => {
    // get details from request body
    // check all fields are present
    // check for image and video, check for thambnail and video file
    // if not present, throw error
    // upload them to cloudinary, avatar
    // create video object - create entry in db
    // check for video creation
    // return response
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video id is required");
    }

    const foundVideo = await Video.findById(videoId);

    if (!foundVideo) {
        throw new ApiError(404, "Video not found in database");
    }

    // Use existing values as defaults
    let { title, description, thumbnail } = foundVideo;
    let { newTitle, newDescription } = req.body;

    // If new values are provided, use them
    if (newTitle) title = newTitle;
    if (newDescription) description = newDescription;

    // Handle thumbnail update if provided
    let newThumbnailUrl = thumbnail;
    const newThumbnailLocalPath = req.files?.newThumbnail?.[0]?.path;
    if (newThumbnailLocalPath) {
        const newThumbnail = await uploadOnCloudinary(newThumbnailLocalPath);
        if (newThumbnail?.url) {
            newThumbnailUrl = newThumbnail.url;
        }
    }

    const updatedVideoDetails = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: newThumbnailUrl,
            },
        },
        {
            new: true,
        }
    );

    res.status(200).json(
        new ApiResponse(200, "Video updated successfully", updatedVideoDetails)
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video

    // console.log(videoId);

    const deletedVideo = await Video.findByIdAndDelete(videoId);

    res.status(201).json(
        new ApiResponse(201, "Video deleted successfully ", deletedVideo)
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "Video id is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId, // use videoId directly
        {
            $set: {
                isPublished: !video.isPublished,
            },
        },
        {
            new: true,
        }
    );

    if (!updatedVideo) {
        throw new ApiError(500, "Failed to toggle publish status");
    }

    res.status(200).json(
        new ApiResponse(
            200,
            "Video publish status toggled successfully",
            updatedVideo
        )
    );
});

// video.controller.js

const getVideosByChannel = asyncHandler(async (req, res) => {
    const { channelId } = req.params; // channelId from route params
    let {
        page = 1,
        limit = 12,
        sortBy = "createdAt",
        sortType = "desc",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const sortDirection = sortType === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortDirection };

    // Match videos where VideoCreater equals channelId
    const match = {
        VideoCreater: new mongoose.Types.ObjectId(channelId),
    };

    const aggregate = Video.aggregate([
        { $match: match },
        {
            $lookup: {
                from: "users",
                localField: "VideoCreater",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    { $project: { username: 1, avatar: 1, fullName: 1 } },
                ],
            },
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
            },
        },
        { $project: { ownerDetails: 0 } },
        { $sort: sort },
    ]);

    const options = { page, limit };
    const videos = await Video.aggregatePaginate(aggregate, options);

    res.status(200).json(
        new ApiResponse(
            200,
            { videos },
            "Videos fetched for channel successfully"
        )
    );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getVideosByChannel
};
