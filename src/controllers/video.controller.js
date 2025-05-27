import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 12, query, sortBy, sortType, userId } = req.query;
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

    console.log(id);

    const findedVideo = await Video.findById(id);

    if (!findedVideo) {
        throw new ApiError(404, "Video not found");
    }

    res.status(201).json(
        new ApiResponse(201, "Video found successfully", findedVideo)
    );
});

const updateVideo = asyncHandler(async (req, res) => {
    // get video id by perams
    // find video in database
    // if video not found then throw error
    // destructured the details from video like title, description, thumbnail
    // change the title, description, and thumbnail according to the user
    // change the diffence in database and save
    // check the diffence are saved in databse
    // return the response and updated video

    const { videoId } = req.params;
    //TODO: update video details like title, description, thumbnail

    if (!videoId) {
        throw new ApiError(400, "Video id is required");
    }

    const foundedVideo = await Video.findById(videoId);

    if (!foundedVideo) {
        throw new ApiError(400, "video not found in database");
    }

    const { title, description, thumbnail } = foundedVideo;

    let { newTitle, newDescription } = req.body;

    const newThumbnailLocalPath = req.files?.newThumbnail[0]?.path;

    if (!newThumbnailLocalPath) {
        throw new ApiError(400, "newThumbnailLocalPath not found");
    }

    let newThumbnail = await uploadOnCloudinary(newThumbnailLocalPath);

    // console.log(newThumbnail);

    if (!newTitle) {
        newTitle = title;
    }
    if (!newDescription) {
        newDescription = description;
    }

    if (!newThumbnail) {
        newThumbnail = thumbnail;
    }

    const updatedVideoDetails = await Video.findByIdAndUpdate(
        videoId,
        {
            title: newTitle,
            description: newDescription,
            thumbnail: newThumbnail.url,
        },
        {
            new: true,
        }
    );

    res.status(201).json(
        new ApiResponse(201, "successfully", updatedVideoDetails)
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
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
