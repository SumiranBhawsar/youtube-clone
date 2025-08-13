import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Playlist } from "../models/playlist.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";
// import { use } from "react";

const createPlaylist = asyncHandler(async (req, res) => {
    // get data from the body
    // check all fields are empty or not
    // get current user from req.user
    // create the playlist with the help of data

    const { name, description } = req.body;

    if (!name || !description) {
        throw new ApiError(401, "All fields are required");
    }

    const userId = req.user._id || req.user;

    const existedPlaylist = await Playlist.aggregate([
        {
            $match: {
                name,
                owner: userId,
            },
        },
    ]);

    console.log(existedPlaylist);

    if (existedPlaylist.length > 0) {
        throw new ApiError(403, "Playlist already exists in your account");
    }

    // console.log(userId);
    const createdPlaylist = await Playlist.create({
        name,
        description,
        owner: userId,
        // video: [],
    });

    console.log(createdPlaylist);

    res.status(200).json(
        new ApiResponse(200, createdPlaylist, "Playlist created successfully")
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                // Assuming the owner field in your Playlist model is named 'owner'
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        // Lookup the videos associated with each playlist
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            },
        },
        // Add fields for total videos and the first video's thumbnail
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
                // Get the thumbnail of the first video in the array
                thumbnail: { $first: "$videos.thumbnail" },
            },
        },
        // Project the final fields to send to the client
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                thumbnail: 1, // This is the new, crucial field
                createdAt: 1,
                updatedAt: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlists,
                "User playlists fetched successfully"
            )
        );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        // Lookup the full video objects from the 'videos' array of ObjectIDs
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                // Also get the owner of each video
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "VideoCreater",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: { $first: "$owner" },
                        },
                    },
                ],
            },
        },
        // Lookup the playlist owner's details
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                owner: { $first: "$owner" },
                totalVideos: { $size: "$videos" },
                totalViews: { $sum: "$videos.views" },
                // Get the thumbnail of the first video for the cover image
                firstVideoThumbnail: { $first: "$videos.thumbnail" },
            },
        },
    ]);

    if (!playlist.length) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist[0], "Playlist fetched successfully")
        );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    // get the playlist_id and video_id from the params
    // check field are empty or not
    // find the playlist by id and add a video id into there video array
    // and save
    // send response

    const { playlistId, videoId } = req.params;

    if (!playlistId || !videoId) {
        throw new ApiError(402, "All field are required ");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: videoId,
            },
        },
        {
            new: true,
        }
    );

    // console.log(updatedPlaylist);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                updatedPlaylist,
            },
            "Video Added successfully"
        )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // get playlist_id and video_id from the params
    // check field are empty or not
    // find playlist in the database with the help or playlisrt_id and delete the video from there field Videos with the help of Video_id

    const { playlistId, videoId } = req.params;
    // TODO: remove video from playlist

    if (!playlistId || !videoId) {
        throw new ApiError(402, "All fields are required");
    }

    const playlistAfterVideoDelete = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: { videos: videoId },
        }
    );

    // console.log(playlistAfterVideoDelete.videos);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                deletedVideo: playlistAfterVideoDelete.videos[0],
            },
            "Video deleted successfully"
        )
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    // get playlist id from param
    // check id field is not empty
    // find playlist in the database and delete
    // send response

    const { playlistId } = req.params;
    // TODO: delete playlist
    if (!playlistId) {
        throw new ApiError(402, "All fields are required");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                deletedPlaylist,
            },
            "Playlist deleted successfully"
        )
    );
});

const updatePlaylist = asyncHandler(async (req, res) => {
    // get data from the body
    // get playlist id from the params
    // check all field is not empty
    // find playlist in the database and update
    // send the response

    const { playlistId } = req.params;
    const { name, description } = req.body;
    //TODO: update playlist

    if (!playlistId || !name || !description) {
        throw new ApiError(402, "All fields are required");
    }

    const updatedPlaylistDetils = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name: name,
                description: description,
            },
        },
        {
            new: true,
            upsert: false,
        }
    );

    // console.log(updatedPlaylistDetils);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                updatedPlaylistDetils,
            },
            "Playlist details are updated successfully"
        )
    );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
