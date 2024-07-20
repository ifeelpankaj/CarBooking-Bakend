import fs from "fs";
import cloudinary from "cloudinary";
import { User } from "../models/UserModel.js";
import { Cab } from "../models/CabModel.js";
import { sendMail } from "../utils/sendEmail.js";
import { Cachestorage } from "../app.js";
import NodeCache from "node-cache";


export const registerCab = async (req, res) => {
  try {
    // Check if the user is either a driver or an admin
    if (req.user.role !== "Driver" && req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Drivers are allowed to register their car here.",
      });
    }

    const tmpDir = "./tmp";
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }

    let uploadedImages = [];

    if (req.files && req.files.photos) {
      const photos = Array.isArray(req.files.photos)
        ? req.files.photos
        : [req.files.photos];

      const imagePromises = photos.map(async (image) => {
        try {
          const myCloud = await cloudinary.v2.uploader.upload(
            image.tempFilePath,
            {
              folder: "TandT/Cars",
              resource_type: "image",
            }
          );

          return {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        } catch (uploadError) {
          console.error(`Failed to upload image ${image.name}:`, uploadError);
          throw uploadError;
        }
      });

      uploadedImages = await Promise.all(imagePromises);
    } else {
      return res.status(400).json({
        success: false,
        message: "No images provided for upload.",
      });
    }

    const belongsTo = await User.findById(req.user._id);
    const carData = {
      modelName: req.body.modelName,
      feature: req.body.feature,
      capacity: req.body.capacity,
      belongsTo: req.user._id,
      cabNumber: req.body.cabNumber,
      rate: req.body.rate,
      photos: uploadedImages,  // Include the uploaded images
    };

    const car = await Cab.create(carData);

    // Update user's haveCab field
    await User.findByIdAndUpdate(req.user._id, { haveCab: true });

    // Remove tmp directory after successful upload and database operations
    fs.rmSync("./tmp", { recursive: true });

    // Send email notification
    const emailContent = `Your Car "${car.modelName}" has been Registered successfully.`;
    await sendMail(belongsTo.email, "Car Registered Successfully", emailContent);

    Cachestorage.del(['all_cabs', 'all_cabs_user','driver_cabs']);

    res.status(201).json({
      success: true,
      message: "Car Registered Successfully",
      car,
    });
  } catch (error) {
    // Remove tmp directory in case of error
    if (fs.existsSync("./tmp")) {
      fs.rmSync("./tmp", { recursive: true });
    }

    if (error.name === "ValidationError") {
      // Handling validation errors
      const errorMessage = Object.values(error.errors).map((val) => val.message);
      res.status(400).json({
        success: false,
        message: "Validation Error",
        error: errorMessage,
      });
    } else {
      // Other error handling
      res.status(500).json({
        success: false,
        message: "Error registering car",
        error: error.message,
      });
    }
  }
};

export const updateCab = async (req, res) => {
  try {
    // Check if the user is either a vendor or an admin
    if (req.user.role !== "Driver" && req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Drivers are allowed to register their car here.",
      });
    }

    const cabId = req.params.id;
    // Check if the product exists
    const cab = await Cab.findById(cabId);
    if (!cab) {
      return res.status(404).json({
        success: false,
        message: "Cab not found",
      });
    }

    // Check if the user is the owner of the cab
    if (cab.belongsTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You do not have permission to update this cab.",
      });
    }

    const tmpDir = "./tmp";
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }

    let uploadedImages = [];
    if (req.files && req.files.photos) {
      const photos = Array.isArray(req.files.photos)
        ? req.files.photos
        : [req.files.photos];

      for (let i = 0; i < cab.photos.length; i++) {
        await cloudinary.v2.uploader.destroy(cab.photos[i].public_id);
      }

      const imagePromises = photos.map(async (image) => {
        const myCloud = await cloudinary.v2.uploader.upload(
          image.tempFilePath,
          {
            folder: "TandT/Cars",
            resource_type: "image",
          }
        );

        return {
          public_id: myCloud.public_id,
          url: myCloud.secure_url,
        };
      });

      uploadedImages = await Promise.all(imagePromises);
    } else {
      uploadedImages = cab.photos;
    }

    // Delete the temporary directory
    fs.rmSync("./tmp", { recursive: true });

    const cabData = {
      modelName: req.body.modelName,
      feature: req.body.feature,
      capacity: req.body.capacity,
      photos: uploadedImages,
    };

    // Use the update method to update the product
    const updatedCab = await Cab.findByIdAndUpdate(
      cabId,
      cabData,
      {
        new: true,
        runValidators: true,
      }
    );

    Cachestorage.del(['all_cabs', 'all_cabs_user', 'driver_cabs']);

    res.status(200).json({
      success: true,
      message: "Cab Updated Successfully",
      cab: updatedCab,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      // Handling validation errors
      const errorMessage = Object.values(error.errors).map(
        (val) => val.message
      );
      res.status(400).json({
        success: false,
        message: "Validation Error",
        error: errorMessage,
      });
    } else {
      // Other error handling
      res.status(500).json({
        success: false,
        message: "Error updating cabs",
        error: error.message,
      });
    }
  }
};

export const getAllCabs = async (req, res) => {
  try {


    let cabs;
    if (Cachestorage.has("all_cabs_user")) {
      cabs = JSON.parse(Cachestorage.get("all_cabs_user"));
      // console.log(cabs);
    } else {
      cabs = await Cab.find({ avalibility: "Avaliable", isReady: true })
        .populate('username', 'phoneNumber')
        .select('-__v');
      const cacheKey = "all_cabs_user";
      Cachestorage.set(cacheKey, JSON.stringify(cabs));
    }
    if (cabs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No available cabs found",
      });
    }

    res.status(200).json({
      success: true,
      count: cabs.length,
      cabs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching available cabs",
      error: error.message,
    });
  }
};

export const getCab = async(req,res) =>{
  const cabCache = new NodeCache({ stdTTL: 300 });
  try {
    const cachedCab = cabCache.get(req.params.id);

    if (cachedCab) {
      return res.status(200).json({
        success: true,
        cab: cachedCab,
      });
    }

    const cab = await Cab.findById(req.params.id).lean();
    if (!cab) {
      return res.status(404).json({
        success: false,
        message: "Cab Not Found",
      });
    }
    cabCache.set(req.params.id, cab);
    res.status(200).json({
      success:true,
      cab,
    })

  } catch (error) {
    next(error);
  }
}

export const getDriverCabs = async(req,res) =>{
  try {
    let driverCabs;
    Cachestorage.del(['driver_cabs'])
    if(Cachestorage.has("driver_cabs")){
      driverCabs = JSON.parse(Cachestorage.get("driver_cabs"));
    }else{
      driverCabs = await Cab.find({belongsTo:req.user._id}).select('-_v');
      const cacheKey = "driver_cabs";
      Cachestorage.set(cacheKey,JSON.stringify(driverCabs));
    }
    if(driverCabs.length === 0){
      return res.status(404).json({
        success:false,
        message:"No Ride found",
      })
    }
    res.status(200).json({
      success: true,
      count: driverCabs.length,
      driverCabs,
    });
     
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching available cabs",
      error: error.message,
    });
  }
};