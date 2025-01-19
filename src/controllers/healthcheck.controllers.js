import { ApiResponse } from "../utils/apiResponse.js";
import  asyncHandler  from "../utils/asyncHandler.js";

const healtcheck = asyncHandler(async (req, res)=>{
    return res.status(200).json(new ApiResponse(200,"ok","Health check passed"))
})

export { healtcheck };