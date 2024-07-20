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

    cabNumber:{
        type:String,
        require:true,
    },

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


export const Cab = mongoose.models.Cab || mongoose.model("Cab", cabSchema);