import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
    // get details from request body
    // check all fields are present
    // check for image and video, check for thambnail and video file
    // if not present, throw error
    // upload them to cloudinary, avatar
    // create video object - create entry in db
    // check for video creation
    // return response

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

    // console.log(videoFile);

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
    //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
