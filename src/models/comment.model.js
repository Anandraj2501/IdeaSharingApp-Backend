import mongoose, { Schema } from "mongoose";
const commentSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        idea: {
            type: Schema.Types.ObjectId,
            ref: "Idea", // Associates the comment with an idea
            required: true,
        },
        parent: {
            type: Schema.Types.ObjectId,
            ref: "Comment", // Self-reference to allow replies
            default: null,
        },
    },
    { timestamps: true }
);

export const Comment = mongoose.model("Comment",commentSchema);