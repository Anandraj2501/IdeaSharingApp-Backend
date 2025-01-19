import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },
        password: {
            type: String,
            required: true,
            unique: true
        },
        avatar: {
            type: String  //Cloudinary url
        },
        coverimage: {
            type: String //Cloudinary url
        },
        refreshtoken:{
            type: String
        },
        isAdmin: {
            type: Boolean,
            default: false // Default value set to false
        },
        ideas: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Idea' // Reference to the Idea model
            }
        ]
    },
    {timestamps:true}
)

//for hashing password.
userSchema.pre("save", async function (next) {

    //if the modified field is not password simply don't run the line 46, just return.
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

//for comapring password at the time of login.
userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
}


userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}


userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User", userSchema);