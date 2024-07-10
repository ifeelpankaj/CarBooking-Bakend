import mongoose from "mongoose";
const imageSchema = new mongoose.Schema({
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  });
const cabSchema = new mongoose.Schema({

    modelName: {
        type: String,
        required: true,
    },
    type:{
        type:String,
        enum: ["4seater", "6seater","7seater"],
        default: "4seater",
    },
    capacity: {
        type: Number,
        required: true,
    },
    feature: {
        type: String,
        enum: ["AC", "NON/AC"],

    },
    belongsTo: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
    },
    photos: [imageSchema],

    avalibility: {
        type: String,
        enum: ["Avaliable", "Booked"],
        default: "Avaliable",
    },
    rate:{
        type:Number
    },
    //Rate must be assigned by admin then only it will visible in get all cab
    isReady:{
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },  
});


export const Cab = mongoose.model("Cab", cabSchema);