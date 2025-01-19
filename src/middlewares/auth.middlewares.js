import { APiError } from "../utils/ApiError.js";
import  asyncHandler  from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/apiResponse.js";

export const verifyJWT = asyncHandler(async(req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
        

        if (!token) {
            throw new APiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshtoken")
    
        if (!user) {
            
            return res.status(401).json(new ApiResponse(401, {}, "Invalid Access Token"));
        }
    
        req.user = user;
        next()
    } catch (error) {
        return res.status(401).json(new ApiResponse(401, {}, "Invalid access token"));
    }
    
}); 

// Middleware to verify if user is an admin
export const verifyAdmin = asyncHandler(async (req, res, next) => {
    // Ensure that `req.user` is populated by `verifyJWT` middleware
    if (!req.user) {
        return res.status(401).json(new ApiResponse(401, {}, "Unauthorized request. User not authenticated."));
    }

    // Check if the user is an admin
    if (!req.user.isAdmin) {
        return res.status(403).json(new ApiResponse(403, {}, "Access denied. Admins only."));
        
    }

    // User is an admin, proceed to the next middleware or route
    next();
});