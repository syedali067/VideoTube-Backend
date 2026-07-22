import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

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
            $set: { 
                refreshToken: undefined 
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

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
};