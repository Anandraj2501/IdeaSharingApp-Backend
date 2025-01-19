import { Comment } from "../models/comment.model.js";
import { ApiResponse } from "../utils/apiResponse.js";

const getComments = async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch top-level comments for the idea
        const topLevelComments = await Comment.find({ idea: id, parent: null });

        // Recursively fetch replies for each comment
        const fetchReplies = async (comment) => {
            const replies = await Comment.find({ parent: comment._id });
            const nestedReplies = await Promise.all(replies.map(fetchReplies));
            return {
                _id: comment._id,
                name: comment.name,
                text: comment.text,
                replies: nestedReplies,
            };
        };

        const commentsData = await Promise.all(
            topLevelComments.map(fetchReplies)
        );


        res.status(201).json(new ApiResponse(201, commentsData, "Comments fetched successfully"));
    } catch (error) {
        console.error("Error fetching comments:", error);
        res.status(400).json(new ApiResponse(400, {}, "Failed to fetch Comments"));
    }
};


const addComment = async (req, res) => {
    const { name, text, ideaId, parent } = req.body;


    try {
        const newComment = new Comment({
            name: req?.user?.username,
            text,
            idea: ideaId,
            parent: parent || null,
        });

        await newComment.save();

        
        res.status(201).json(new ApiResponse(201, newComment, "Comments added successfully"));
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(201).json(new ApiResponse(500, {}, "Failed to add comments")); 
    }
};

export {getComments, addComment};