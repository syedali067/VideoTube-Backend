import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req, _ , next)=>
{
    try{
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if(!token){
            throw new ApiError(401, "Unauthorized Request");
        }
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded._id).select("-password -refreshToken");
        if(!user){
            throw new ApiError(401, "Invalid Access Token");
        }
        req.user = user;
        next();
    } 
    catch(error)
    {
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }
})

// Same idea as verifyJWT, but never rejects the request.
// If a valid token is present, req.user is populated (so controllers can
// personalize the response, e.g. isSubscribed). If not, req.user stays
// undefined and the request continues as an anonymous visitor.
export const optionalAuth = asyncHandler(async(req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            return next();
        }
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded._id).select("-password -refreshToken");
        if (user) {
            req.user = user;
        }
        next();
    } catch (error) {
        // invalid/expired token — treat as anonymous rather than failing the request
        next();
    }
})