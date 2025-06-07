import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
    let {
        page = 1,
        limit = 12,
        query = "",
        sortBy = "createdAt",
        sortType = "desc",
    } = req.query;

    // Parse integers
    page = parseInt(page);
    limit = parseInt(limit);

    if (!query) {
        throw new ApiError(401, "All fields are required");
    }

    // Match conditions
    const match = {
        // VideoCreater: new mongoose.Types.ObjectId(userId),
        $or: [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ],
    };

    // Sorting
    const sortDirection = sortType === "asc" ? 1 : -1;
    const sort = { [sortBy]: sortDirection };

    // Aggregation pipeline
    const aggregate = Video.aggregate([{ $match: match }, { $sort: sort }]);

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

    // Send response
    res.status(200).json(
        new ApiResponse(
            200,
            {
                allVideosAccordingToQuery,
            },
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
    const { id } = req.params;

    // console.log(id);

    const findedVideo = await Video.findById(id);

    if (!findedVideo) {
        throw new ApiError(404, "Video not found");
    }
    // Add video to user's watch history if not already present
    const addVideoIdInWatchHistoryField = await User.findByIdAndUpdate(
        req.user,
        { $addToSet: { watchHistory: findedVideo._id } },
        { new: true }
    );

    console.log(addVideoIdInWatchHistoryField);

    res.status(201).json(
        new ApiResponse(201, "Video found successfully", {
            video: findedVideo,
        })
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

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
