import mongoose, { Schema } from "mongoose";

const ideaSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true, 
        },
        description: {
            type: String,
            required: true,
        },
        shortDescription:{
            type: String,
            required: true,
        },
        tags: [String],
        images: [String],
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"], // Valid statuses
            default: "Pending", // Default value
            required: true,
        },
        state:{
            type: String,
            enum : ["Todo","Inprogress","Completed"],
            default: "Todo",
            required: false,
        },
        remarks: {
            type: String,
            trim: true, // Removes extra spaces
            default: "", // Optional field with default empty string
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        statusUpdatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User", // Reference to the User model
        },
        remarkUpdatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User", // Reference to the User model
        },
        likes: {
            count: {
                type: Number,
                default: 0, // Total number of likes
            },
            users: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "User", // Users who liked the idea
                },
            ],
        },
    },
    { timestamps: true }
);

export const Idea = mongoose.model("Idea", ideaSchema);
