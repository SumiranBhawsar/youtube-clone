import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Comment } from "../models/comment.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import mongoose, { Schema } from "mongoose";

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!videoId) {
        throw new ApiError(400, "All fields are required");
    }

    // console.log(videoId);

    // const allComments = await Comment.find({ video: videoId });

    const newVideoId = new mongoose.Types.ObjectId(videoId);

    const aggregate = Comment.aggregate([
        {
            $match: { video: newVideoId },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
    ]);

    // const aggregate = Comment.aggregate([
    //     {
    //         $match: {
    //             video: new mongoose.Types.ObjectId(videoId),
    //         },
    //     },
    //     {
    //         $sort: {
    //             createdAt: -1,
    //         },
    //     },
    // ]);

    // console.log(aggregate);

    const options = {
        page,
        limit,
    };

    // const fetchedAllComments = await Video.aggregatePaginate(
    //     allComments,
    //     options
    // );

    // console.log(fetchedAllComments);

    const allComments = await Comment.aggregatePaginate(aggregate, options);

    // console.log(allComments);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                allComments,
            },
            "All comments are fetched successfully"
        )
    );
});

const addComment = asyncHandler(async (req, res) => {
    // get videoId from the param
    // get comment from the req.body
    // check comment is empty
    // create a comment for video by current user
    // send response

    const { videoId } = req.params;
    const { content } = req.body;

    if (!content || !videoId) {
        throw new ApiError(402, "All fields are required");
    }

    const addedComment = await Comment.create({
        content,
        video: videoId,
        owner: req.user,
    });

    // console.log(createdComment);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                addedComment,
            },
            "Comment Added successfully"
        )
    );
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    // get comment id from params
    // get data for update comment
    // check id field is empty
    // find comment and update by findByIdAndUpdate
    // send response

    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || !commentId) {
        throw new ApiError(402, "All fields are required");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: content,
            },
        },
        {
            new: true,
        }
    );

    // console.log(updatedComment);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                updatedComment,
            },
            "Comment Updated Successfully"
        )
    );
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    // get comment id from params
    // check params is not empty
    // find comment by id and delete
    // send response

    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(402, "All fields are required");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    res.status(200).json(
        new ApiResponse(
            200,
            {
                deletedComment,
            },
            "Comment Deleted Successfully"
        )
    );
});

export { addComment, updateComment, deleteComment, getVideoComments };
