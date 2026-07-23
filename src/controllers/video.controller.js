import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    const matchStage = { isPublished: true }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId")
        }
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    if (query) {
        matchStage.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }

    const sortStage = {}
    sortStage[sortBy || "createdAt"] = sortType === "asc" ? 1 : -1

    const aggregate = Video.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    { $project: { username: 1, fullName: 1, avatar: 1 } }
                ]
            }
        },
        { $addFields: { owner: { $first: "$owner" } } },
        { $sort: sortStage }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const videos = await Video.aggregatePaginate(aggregate, options)

    return res
        .status(200)
        .json(new ApiResponse(200, "Videos fetched successfully", videos))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Title and description are required")
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required")
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!videoFile) {
        throw new ApiError(500, "Error while uploading video file")
    }
    if (!thumbnail) {
        throw new ApiError(500, "Error while uploading thumbnail")
    }

    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration || 0,
        owner: req.user?._id
    })

    const createdVideo = await Video.findById(video._id)
    if (!createdVideo) {
        throw new ApiError(500, "Error while publishing video")
    }

    return res
        .status(201)
        .json(new ApiResponse(201, "Video published successfully", createdVideo))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    { $project: { username: 1, fullName: 1, avatar: 1 } }
                ]
            }
        },
        { $addFields: { owner: { $first: "$owner" } } }
    ])

    if (!video?.length) {
        throw new ApiError(404, "Video not found")
    }

    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } })

    return res
        .status(200)
        .json(new ApiResponse(200, "Video fetched successfully", video[0]))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video")
    }

    const updateFields = {}
    if (title) updateFields.title = title
    if (description) updateFields.description = description

    const thumbnailLocalPath = req.file?.path
    if (thumbnailLocalPath) {
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
        if (!thumbnail?.url) {
            throw new ApiError(500, "Error while uploading thumbnail")
        }
        updateFields.thumbnail = thumbnail.url
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateFields },
        { returnDocument: "after" }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, "Video updated successfully", updatedVideo))
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video")
    }

    await Video.findByIdAndDelete(videoId)

    return res
        .status(200)
        .json(new ApiResponse(200, "Video deleted successfully", {}))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this video")
    }

    video.isPublished = !video.isPublished
    await video.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, "Publish status toggled successfully", video))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}