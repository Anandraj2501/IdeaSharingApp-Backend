import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/apiResponse.js";

const verifyToken = (req, res) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
     
    if (!token) {
        throw new ApiResponse(401, "Unauthorized request");
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        return res.status(200).json(
            new ApiResponse(200,{},"Valid Access token")
        );
    } catch (error) {
        return res.status(401).json(
            new ApiResponse(401,{},"Invalid or Expired Token")
        );
    }
    
};

export { verifyToken };
