import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const generateAccessAndRefreshTokens = async function(userId) {
    try{
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
    }
    catch(error){
        console.log(error);
        throw new ApiError(500, "Error while generating tokens");
    }
};

const registerUser = asyncHandler(async (req, res) => { 
    //get data from user
    const { username, email, fullName, password } = req.body;
    console.log(req.body);
    //validation
    if(
        [username, email, fullName, password].some((field) => field?.trim() === "")
    )
    {
        throw new ApiError(400, "All fields are required");
    }

    //check if user already exists
    const existingUser = await User.findOne({ 
        $or: [{ email }, { username }] 
     });
    if(existingUser){
        throw new ApiError(409, "User with email or username already exists");
    }

    //check for images or avatar
    const avatarLocalPath = req.files?.avatar[0].path;
    const coverImageLocalPath = req.files?.coverImage[0].path;
    if(!avatarLocalPath) 
    {
        throw new ApiError(400, "Avatar file is required");
    }

    //upload images to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar) 
    {
        throw new ApiError(400, "Avatar file is required");
    }

    //create user object - create document in mongodb
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    });
    if(!user){
        throw new ApiError(500, "Error while creating user");
    }

    //remove password from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    //check for user creation
    if(!createdUser){
        throw new ApiError(500, "Error while creating user");
    }

    //send response
    return res.status(201).json(
        new ApiResponse(200, "User registered successfully", createdUser)
    );
});

const loginUser = asyncHandler(async (req, res) => {
    //req body-> data
    const { username, email, password } = req.body;

    if(!(username || email))
    {
        throw new ApiError(400, "Username or email is required");
    }
    //username or email
    const user = await User.findOne({ $or: [{ username }, { email }] });
    //find the user
    if(!user){
        throw new ApiError(404, "User not found");
    }
    //password check
    const isPasswordValid = await user.comparePassword(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials");
    }
    //access token and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    
    //send cookies
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                "User logged in successfully",
                { user: loggedInUser, accessToken, refreshToken }
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, 
        { 
            $unset: { 
                refreshToken: 1 
            } 
        },
        {
             returnDocument: 'after' 
        }
    );
    const options = {
        httpOnly: true,
        secure: true
    };
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(
            200,
            "User logged out successfully"
        )
    );

});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized Request");
    }
    try{
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token");
        }

        if(user?.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, "Refresh Token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true
        };
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                "Access token refreshed successfully",
                { accessToken, newRefreshToken }
            )
        );
    }
    catch(error){
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPAsswordCorrect = await user.comparePassword(oldPassword)
    if(!isPAsswordCorrect)
    {
        throw new ApiError(400,"Invalid Old Password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false})

    return res.status(200)
    .json(new ApiResponse(200, "Password Changed Successfully", {}))
});

const getCurrentUser = asyncHandler(async(req, res) =>{
    return res
    .status(200)
    .json(new ApiResponse(200, "Current User Fetched Successfully", req.user))
});

const updateAccountDetails = asyncHandler(async(req,res) =>{
    const {fullName, email} = req.body

    if(!fullName || !email)
    {
        throw new ApiError(400, "All Fields Required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:
            {
                fullName,
                email
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account Details Updated Successfully"))

});

const updateUserAvatar = asyncHandler(async(req,res) => {
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath)
    {
        throw new ApiError(400, "Avatar File is Missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url)
    {
        throw new ApiError(400, "Api Error while uploading Avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar : avatar.url
            }
        },
        { 
            new: true, returnDocument: 'after' 
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Avatar Updated Successfully", user)
    )
});

const updateUserCoverImage = asyncHandler(async(req,res) => {
    const coverLocalPath = req.file?.path
    if(!coverLocalPath)
    {
        throw new ApiError(400, "Cover Image is Missing")
    }

    const coverImage = await uploadOnCloudinary(coverLocalPath)

    if(!coverImage.url)
    {
        throw new ApiError(400, "Api Error while uploading Cover Image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage : coverImage.url
            }
        },
        { 
            new: true, returnDocument: 'after' 
        }
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Cover Image Updated Successfully", user)
    )
});

const getUserChannelProfile = asyncHandler(async(req,res) =>{
    const {username} = req.params
    if(!username?.trim())
    {
        throw new ApiError(400,"User Name not Found")
    }
    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscription",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {

            $lookup:{
                from:"subscription",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                        then: true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])
    if(!channel?.length){
        throw new ApiError(404,"Channel Does not Exists")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"User Channel Fetched Successfully"))
})

const getWatchHistory = asyncHandler(async(req,res) =>{
    const user = await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"video",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {

                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:"$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res
    .status(200)
    .json(new ApiResponse(200,user[0].watchHistory,"Watch History Fetched Successfully"))
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};