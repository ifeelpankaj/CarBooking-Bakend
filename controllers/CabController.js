import fs from "fs";
import cloudinary from "cloudinary";
import { User } from "../models/UserModel.js";
import { RegisterCabEmail, sendMail } from "../utils/sendEmail.js";
import { Cachestorage } from "../app.js";
import NodeCache from "node-cache";
import axios from'axios';
import { Cab } from "../models/CabModel.js";
import { Order } from "../models/OrderModel.js";
import CabServices from "../operations/CabServices.js";
import { extractAndRoundNumber } from "../utils/utils.js";


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

      uploadedImages = await CabServices.uploadCabImages(photos);
    } else {
      await CabServices.removeTmpDir(tmpDir);
      return res.status(400).json({
        success: false,
        message: "No images provided for upload.",
      });
    }

    const carData = {
      modelName: req.body.modelName,
      feature: req.body.feature,
      capacity: req.body.capacity,
      cabNumber: req.body.cabNumber,
      rate: req.body.rate,
    };

    const car = await CabServices.registerCab(req.user._id, carData, uploadedImages);

    await CabServices.removeTmpDir(tmpDir);

    await sendMail(req.user.email, "Car Registered Successfully", RegisterCabEmail(car.modelName));

    Cachestorage.del(['all_cabs', 'all_cabs_user', 'driver_cabs']);

    res.status(201).json({
      success: true,
      message: "Car Registered Successfully",
      car,
    });
  } catch (error) {
    await CabServices.removeTmpDir(tmpDir);

    if (error.name === "ValidationError") {
      const errorMessage = Object.values(error.errors).map((val) => val.message);
      res.status(400).json({
        success: false,
        message: "Validation Error",
        error: errorMessage,
      });
    } else {
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
      const cab = await CabServices.findCabs({ _id: id });

      // Check if the user is the owner of the cab
      if (cab.belongsTo.toString() !== req.user._id.toString()) {
          return res.status(403).json({
              success: false,
              message: "Access denied. You do not have permission to update this cab.",
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

          // Delete old images
          await CabServices.deleteOldImages(cab);

          // Upload new images
          uploadedImages = await CabServices.uploadCabImages(photos);
      } else {
          uploadedImages = cab.photos;
      }

      // Delete the temporary directory
      await CabServices.removeTmpDir(tmpDir);

      const cabData = {
          modelName: req.body.modelName,
          feature: req.body.feature,
          capacity: req.body.capacity,
          cabNumber: req.body.cabNumber,
      };

      // Update the cab
      const updatedCab = await CabServices.updateCab(cabId, cabData, uploadedImages);

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
    // Cachestorage.del(['all_cabs_user'])
    if (Cachestorage.has("all_cabs_user")) {
      cabs = JSON.parse(Cachestorage.get("all_cabs_user"));
    } else {
      cabs = await CabServices.findCabs({ isReady: true });

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

export const getCab = async(req,res,next) =>{
  const cabCache = new NodeCache({ stdTTL: 300 });
  try {
    const cachedCab = cabCache.get(req.params.id);

    if (cachedCab) {
      return res.status(200).json({
        success: true,
        cab: cachedCab,
      });
    }

    const cab = await CabServices.findCabs({_id:req.params.id});
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
    if (req.user.role !== "Driver" && req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Drivers are allowed to register their car here.",
      });
    }
    let driverCabs;
    if(Cachestorage.has("driver_cabs")){
      driverCabs = JSON.parse(Cachestorage.get("driver_cabs"));
    }else{
      driverCabs = await CabServices.findCabs({belongsTo:req.user._id});
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

export const deleteCab  =  async(req,res) =>{
  try {
    if (req.user.role !== "Driver" && req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Drivers are allowed to register their car here.",
      });
    }
      const {Id} = req.params;
      const cabs  =  await CabServices.findCabs({_id:Id});

      if(!cabs){
        return res.status(404).json({
          success: false,
          message: "Cab Not Found",
        });
      }

      for (let index = 0; index < cabs.photos.length; index++) {
        await cloudinary.v2.uploader.destroy(cabs.photos[index].public_id);
      }
      await Cab.deleteOne({ _id: Id });

      Cachestorage.del(['all_cabs', 'all_cabs_user', 'driver_cabs']);

      const left = await Cab.find({belongsTo:req.user._id}).select('-_v'); 

      if(left.length < 1){
        await User.findByIdAndUpdate(req.user._id, { haveCab: false });
      }

      res.status(200).json({
        success: true,
        message: "Cab Deleted Successfully",
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting Cab",
      error: error.message,
    });
  }
}



export const calculateDistance = async (req, res) => {
  const { origin, destination } = req.query;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/distancematrix/json`, {
      params: {
        origins: origin,
        destinations: destination,
        key: apiKey
      }
    });

    const data = response.data;

    if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
      const distance = data.rows[0].elements[0].distance.text;
      const duration = data.rows[0].elements[0].duration.text;
      const finalDistance = extractAndRoundNumber(distance);

      return res.json({
        distance,
        duration
      });
    } else {
      res.status(400).json({ error: 'Unable to calculate distance' });
    }
  } catch (error) {
    console.error('Error calculating distance:', error);
    res.status(500).json({ error: 'An error occurred while fetching the distance' });
  }
};

//Not used Anywhere
export const getCabWithUpcomingBookings = async (req, res) => {
  try {
    const { cabId } = req.params;

    // Find the cab
    const cab = await Cab.findById(cabId);

    if (!cab) {
      return res.status(404).json({ message: "Cab not found" });
    }

    // Find upcoming orders for this cab
    const upcomingOrders = await Order.find({
      bookedCab: cabId,
      departureDate: { $gte: new Date() },
      bookingStatus: { $in: ['Pending', 'Confirmed','Assigned'] }
    }).sort({ departureDate: 1 });

    // Update the cab's upcomingBookings
    cab.upcomingBookings = upcomingOrders.map(order => order._id);
    await cab.save();

    // Prepare the response
    const upcomingBookings = upcomingOrders.map(order => ({
      orderId: order._id,
      departureDate: order.departureDate,
      pickupLocation: order.pickupLocation,
      destination: order.destination,
      bookingStatus: order.bookingStatus
    }));

    res.status(200).json({
      success: true,
      upcomingBookings
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};