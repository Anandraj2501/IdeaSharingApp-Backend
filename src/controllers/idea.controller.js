import { ApiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Idea } from "../models/idea.model.js";
import { User } from "../models/user.model.js";
import { APiError } from "../utils/ApiError.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

//Add idea to the database.
import fs from "fs/promises"; // Use promise-based fs module

const addIdea = asyncHandler(async (req, res, next) => {
    try {
        // Extract title, description, tags, and owner from request body
        const { title, description, tags, shortDescription } = req.body;

        if (!title || !description || !shortDescription) {
            return res.status(400).json(
                new ApiResponse(400, {}, "Title, description or shortDescription is missing")
            );
        }

        // Process multiple file uploads
        const uploadedImages = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const uploadedImage = await uploadOnCloudinary(file.path); // Assuming `uploadOnCloudinary` uploads the file and returns a URL
                uploadedImages.push(uploadedImage.url); // Collect the uploaded image URLs
            }
        }

        // Create a new idea instance
        const idea = new Idea({
            title,
            description,
            shortDescription,
            tags,
            images: uploadedImages, // Store the array of uploaded image URLs
            owner: req.user,
            status: "Pending",
        });

        // Save the new idea to the database
        const savedIdea = await idea.save();

        // Add the idea to the user's ideas array
        await User.findByIdAndUpdate(
            req.user._id,
            { $push: { ideas: savedIdea._id } }, // Add the idea ID to the user's ideas array
            { new: true }
        );

        // Send a success response
        res.status(201).json(new ApiResponse(201, savedIdea, "Idea added successfully"));
    } catch (error) {
        console.error(error); 
        res.status(400).json(new ApiResponse(400, {}, "Failed to save"));
    }
});



//all ideas for admin
const getIdea = asyncHandler(async (req, res, next) => {
    const { pages = 1, limit = 10 } = req.query

    const pageNum = parseInt(pages, 10);
    const limitNum = parseInt(limit, 10);

    const skip = (pageNum - 1) * limitNum;

    // Get total count of ideas
    const totalIdeas = await Idea.countDocuments();

    // Fetch the paginated ideas
    const ideas = await Idea.find()
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .populate("owner", "username email"); // Optionally, sort by created date

    // Calculate total pages 
    const totalPages = Math.ceil(totalIdeas / limitNum);

    // Return paginated data
    res.status(200).json(new ApiResponse(200, {
        ideas,
        pagination: {
            totalIdeas,
            totalPages,
            currentPage: pageNum,
            perPage: limitNum
        }
    }, "Ideas fetched successfully"
    ));

});

const getTopIdea = asyncHandler(async (req, res, next) => {
    const { limit = 10 } = req.query; // Default limit to 10 top ideas

    const limitNum = parseInt(limit, 10);

    try {
        // Fetch ideas sorted by likes in descending order
        const ideas = await Idea.find()
            .sort({ likes: -1 }) // Sort by likes in descending order
            .limit(limitNum) // Limit the number of results
            .populate("owner", "username email") // Optionally populate owner details
            .select("title description shortDescription likes"); // Select specific fields

        // Return the top ideas
        res.status(200).json(
            new ApiResponse(
                200,
                {
                    ideas,
                },
                "Top ideas fetched successfully"
            )
        );
    } catch (error) {
        console.error("Error fetching top ideas:", error);
        res.status(500).json(new ApiResponse(500, {}, "Failed to fetch top ideas"));
    }
});


const getIdeaById = asyncHandler(async (req, res) => {
    const {id} = req.params;
    
    const idea = await Idea.findById(id).populate("owner", "username email");

    if(idea){
        res.status(201).json(new ApiResponse(201, idea, "Idea with Requested ID"));
    }else{
        res.status(201).json(new ApiResponse(201, {}, "Idea with Requested ID not found"));
    }

})


//for individual user only idea created by them
const getUserIdeas = asyncHandler(async (req, res, next) => {
    const { pages = 1, limit = 10 } = req.query;

    const pageNum = parseInt(pages, 10);
    const limitNum = parseInt(limit, 10);

    const skip = (pageNum - 1) * limitNum;

    // Get total count of user's ideas
    const totalIdeas = await Idea.countDocuments({ owner: req.user._id });

    // Fetch the paginated ideas for the authenticated user
    const ideas = await Idea.find({ owner: req.user._id })
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .populate("owner", "username email"); // Optionally, sort by created date

    // Calculate total pages
    const totalPages = Math.ceil(totalIdeas / limitNum);

    // Return paginated data
    res.status(200).json(
        new ApiResponse(
            200,
            {
                ideas,
                pagination: {
                    totalIdeas,
                    totalPages,
                    currentPage: pageNum,
                    perPage: limitNum,
                },
            },
            "User's ideas fetched successfully"
        )
    );
});


const getIdeaStatistics = asyncHandler(async (req, res) => {
    try {
        // Aggregation pipeline to group by month and count ideas
        const ideaCountsByMonth = await Idea.aggregate([
            {
                $group: {
                    _id: { $month: "$createdAt" }, // Group by month of creation
                    count: { $sum: 1 }, // Count the number of ideas per month
                },
            },
            {
                $sort: { _id: 1 }, // Sort by month (ascending)
            },
        ]);

        // Initialize an array of 12 zeros (for all months)
        const countsByMonth = Array(12).fill(0);
        ideaCountsByMonth.forEach((item) => {
            countsByMonth[item._id - 1] = item.count; // Update counts based on month (_id is the month number)
        });

        // Aggregation pipeline to group by status and count ideas
        // Aggregation pipeline to group by status and count ideas
        const ideaCountsByStatus = await Idea.aggregate([
            {
                $group: {
                    _id: "$status", // Group by status
                    count: { $sum: 1 }, // Count the number of ideas per status
                },
            },
        ]);

        // Ensure all statuses are included with a default count of 0
        const defaultStatuses = ["Pending", "Approved", "Rejected"];
        const countsByStatus = defaultStatuses.reduce((acc, status) => {
            const found = ideaCountsByStatus.find((item) => item._id === status);
            acc[status] = found ? found.count : 0; // Use count if available, otherwise 0
            return acc;
        }, {});

        // Combine the data into an array of objects
        const data = [
            { type: "countByMonth", data: countsByMonth },
            { type: "countByStatus", data: countsByStatus },
        ];

        res.status(200).json(new ApiResponse(200, data, "Idea statistics fetched successfully"));
    } catch (error) {
        console.error("Error fetching idea statistics:", error);
        res.status(500).json(new ApiResponse(500, {}, "Failed to fetch idea statistics"));
    }
});

const getIdeasByState = asyncHandler(async (req, res, next) => {
    const { state, pages = 1, limit = 10 } = req.query;

    if (!state) {
        return res.status(400).json({ message: "State is required" });
    }

    const pageNum = parseInt(pages, 10);
    const limitNum = parseInt(limit, 10);

    const skip = (pageNum - 1) * limitNum;

    // Validate state against allowed values
    const validStates = ["Todo", "Inprogress", "Completed"];
    if (!validStates.includes(state)) {
        return res.status(400).json({ message: `Invalid state. Allowed states are: ${validStates.join(", ")}` });
    }

    // Get total count of ideas with the given state
    const totalIdeas = await Idea.countDocuments({ state });

    // Fetch paginated ideas filtered by state
    const ideas = await Idea.find({ state })
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .populate("owner", "username email"); // Sort by created date (newest first)

    // Calculate total pages
    const totalPages = Math.ceil(totalIdeas / limitNum);

    // Return paginated data
    res.status(200).json(
        new ApiResponse(
            200,
            {
                ideas,
                pagination: {
                    totalIdeas,
                    totalPages,
                    currentPage: pageNum,
                    perPage: limitNum,
                },
            },
            "Ideas by state fetched successfully"
        )
    );
});


const getIdeasByStatus = asyncHandler(async (req, res, next) => {
    const { status, pages = 1, limit = 10 } = req.query;

    if (!status) {
        return res.status(400).json({ message: "Status is required" });
    }

    const pageNum = parseInt(pages, 10);
    const limitNum = parseInt(limit, 10);

    const skip = (pageNum - 1) * limitNum;

    // Get total count of ideas with the given status
    const totalIdeas = await Idea.countDocuments({ status });

    // Fetch paginated ideas filtered by status
    const ideas = await Idea.find({ status })
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }); // Sort by created date (newest first)

    // Calculate total pages
    const totalPages = Math.ceil(totalIdeas / limitNum);

    // Return paginated data
    res.status(200).json(
        new ApiResponse(
            200,
            {
                ideas,
                pagination: {
                    totalIdeas,
                    totalPages,
                    currentPage: pageNum,
                    perPage: limitNum,
                },
            },
            "Ideas by status fetched successfully"
        )
    );
});


const likeIdea = asyncHandler(async (req, res) => {
    const { id } = req.params; // Idea ID
    const userId = req.user._id; // Extracted from authenticated user

    const idea = await Idea.findById(id);

    if (!idea) {
        return res.status(404).json({ message: "Idea not found" });
    }

    // Check if user already liked the idea
    const alreadyLiked = idea.likes.users.includes(userId);

    if (alreadyLiked) {
        // Unlike the idea
        idea.likes.users = idea.likes.users.filter((user) => user.toString() !== userId.toString());
        idea.likes.count -= 1;
    } else {
        // Like the idea
        idea.likes.users.push(userId);
        idea.likes.count += 1;
    }

    await idea.save();

    res.status(200).json({
        message: alreadyLiked ? "Idea unliked successfully" : "Idea liked successfully",
        likes: idea.likes,
    });
});

const updateIdea = asyncHandler(async (req, res, next) => {
    try {
        const { id } = req.params; // Assuming the idea ID is passed as a URL parameter
        const { title, description, tags, shortDescription } = req.body;

        // Retrieve the idea to update
        let idea = await Idea.findById(id);

        if (!idea) {
            return res.status(404).json(new ApiResponse(404, {}, "Idea not found"));
        }

        // Update fields if they are provided in the request
        if (title) idea.title = title;
        if (description) idea.description = description;
        if (tags) idea.tags = tags;
        if (shortDescription) idea.shortDescription = shortDescription;

        // Process uploaded images if any
        if (req.files && req.files.length > 0) {
            const uploadedImages = [];
            for (const file of req.files) {
                const uploadedImage = await uploadOnCloudinary(file.path); // Assuming `uploadOnCloudinary` uploads the file and returns a URL
                uploadedImages.push(uploadedImage.url); // Collect the uploaded image URLs
            }
            idea.images = idea.images.concat(uploadedImages); // Append new images to existing ones
        }

        // Save the updated idea in the database
        await idea.save();
        const updatedIdea = await Idea.findById(id).populate("owner", "username email");
        // Send a success response with the updated idea
        res.status(200).json(new ApiResponse(200, updatedIdea, "Idea updated successfully"));
    } catch (error) {
        console.error(error);
        res.status(400).json(new ApiResponse(400, {}, "Failed to update idea"));
    }
});


//for admin to update status and adding remarks to the idea
const updateIdeaStatus = asyncHandler(async (req, res, next) => {
    const { id } = req.params; // Assuming the idea ID is passed as a URL parameter
    const { status, remarks } = req.body; // Include remarks in the request body
    const userId = req.user._id;

    // Retrieve the idea to update
    let idea = await Idea.findById(id);

    if (!idea) {
        return res.status(404).json(new ApiResponse(404, "Idea not found"));
    }

    // Update status if provided and is valid
    if (status) {
        const validStatuses = ["Pending", "Approved", "Rejected"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json(new ApiResponse(400, `Invalid status. Valid statuses are: ${validStatuses.join(", ")}`));
        }
        idea.status = status;
        idea.statusUpdatedBy = userId;
    }

    // Update remarks if provided
    if (remarks !== undefined) {
        idea.remarks = remarks.trim();// Trim any extra spaces from the remarks
        idea.remarkUpdatedBy = userId;
    }

    // Save the updated idea in the database
    await idea.save();

    // Populate the owner field in the updated idea
    const updatedIdea = await Idea.findById(id).populate("owner", "username email");

    // Send a success response with the updated idea
    res.status(200).json(new ApiResponse(200, updatedIdea, "Idea updated successfully"));
});


//for admin to update status and adding remarks to the idea
const updateIdeaState = asyncHandler(async (req, res, next) => {
    const { id } = req.params; // Assuming the idea ID is passed as a URL parameter
    const { state } = req.body; // Include remarks in the request body
    const userId = req.user._id;
    // Retrieve the idea to update
    let idea = await Idea.findById(id);

    if (!idea) {
        return res.status(404).json(new ApiResponse(404, "Idea not found"));
    }

    // Update state if provided and is valid
    if (state) {
        const validStates = ["Todo", "Inprogress", "Completed"];
        if (!validStates.includes(state)) {
            return res.status(400).json(new ApiResponse(400, `Invalid status. Valid statuses are: ${validStates.join(", ")}`));
        }
        idea.state = state;
    }

    // Save the updated idea in the database
    await idea.save();

    // Populate the owner field in the updated idea
    const updatedIdea = await Idea.findById(id).populate("owner", "username email");

    // Send a success response with the updated idea
    res.status(200).json(new ApiResponse(200, updatedIdea, "Idea updated successfully"));
});


const deleteIdea = asyncHandler(async (req, res, next) => {
    const { id } = req.params;
    // Find the idea by ID and delete it
    const idea = await Idea.findByIdAndDelete(id);

    // If the idea doesn't exist, return a 404 error
    if (!idea) {
        return res.status(404).json(new ApiResponse(404, "Idea not found"));
    }

    // Send a success response
    res.status(200).json(new ApiResponse(200, "Idea deleted successfully"));
})

export { addIdea, getIdea, updateIdea, deleteIdea, updateIdeaStatus, getUserIdeas, getIdeaStatistics, getIdeasByStatus, updateIdeaState, getIdeasByState, likeIdea, getTopIdea, getIdeaById };