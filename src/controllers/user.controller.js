import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {User} from '../models/user.model.js';
import {uploadOnCloudinary} from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';

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

export { registerUser };