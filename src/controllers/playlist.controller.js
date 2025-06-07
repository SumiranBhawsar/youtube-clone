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
    // get user id from the req.params
    // check user is present in database or not
    // find all playlists created by the user
    // send response

    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const allPlaylists = await Playlist.aggregate([
        {
            $match: {
                owner: user._id,
            },
        },
    ]);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                allPlaylists,
            },
            "All Playlists are fetched successfully"
        )
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    //TODO: get playlist by id

    const playlist = await Playlist.findById(playlistId);

    // console.log(playlist);
    res.status(200).json(
        new ApiResponse(
            200,
            {
                playlist,
            },
            "Playlist get by Id successful"
        )
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
