import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
    },
    bookedCab:{
        type: mongoose.Schema.ObjectId,
        ref: "Cab",
        // required: true,
    },
    
    bookingType:{
        type:String,
        enum: ['OneWay', 'RoundTrip'],
        required: true
    },
    departureDate: {
        type: Date,
        required: true
    },

    pickupLocation: {
        type: String,
        required: true
    },
    destination: {
        type: String,
        required: true
    },
    numberOfPassengers: {
        type: Number,
        required: true
    },
    bookingStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Online', 'Hybrid'],
        required: true
    },
    paymentStatus: {
        type: String,
        default: "UnPaid",
    },

    passengers: [{
        firstName: String,
        lastName: String,
        age: Number,
        gender: String,
    }],
    bookingAmount:{
        type:Number
    },
   
    createdAt: {
        type: Date,
        default: Date.now,
    },  
});


export const Order = mongoose.model("Order", orderSchema);