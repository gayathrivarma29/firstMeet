const mongoose = require("mongoose");


const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
          
        },
        firstName: {
            type: String,
            require: true,
           
        },
        lastName: {
            type: String,
            required: true,
           
        },
        userName: {
            type: String,
            required: true,
            unique: true,
            
        },
        password: {
            type: String,
            required: true,
            minLength: 6,
        },
        role: {
            type: String,
            enum: ['admin', 'employee'],
            default: 'employee',
            required: true
        },

    },
    { timestamps: true }
);


module.exports = mongoose.model('User', userSchema);