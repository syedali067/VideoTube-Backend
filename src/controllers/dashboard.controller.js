import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const channelId = req.user?._id

    const videoStats = await Video.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" }
            }
        }
    ])

    const totalSubscribers = await Subscription.countDocuments({ channel: channelId })

    const channelVideoIds = await Video.find({ owner: channelId }).distinct("_id")
    const totalLikes = await Like.countDocuments({ video: { $in: channelVideoIds } })

    const stats = {
        totalVideos: videoStats[0]?.totalVideos || 0,
        totalViews: videoStats[0]?.totalViews || 0,
        totalSubscribers,
        totalLikes
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Channel stats fetched successfully", stats))
})

const getChannelVideos = asyncHandler(async (req, res) => {
    const channelId = req.user?._id

    const videos = await Video.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(channelId) } },
        { $sort: { createdAt: -1 } }
    ])

    return res
        .status(200)
        .json(new ApiResponse(200, "Channel videos fetched successfully", videos))
})

export {
    getChannelStats,
    getChannelVideos
    }