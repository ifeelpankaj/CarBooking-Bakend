import cloudinary from "cloudinary";
import { User } from "../models/UserModel.js";
import { existsSync, mkdirSync } from "fs";
import { Cab } from "../models/CabModel.js";
import { Order } from "../models/OrderModel.js";


export const driverVerification = async (req, res) => {
  try {
    // Check if user is a driver
    if (req.user.role !== "Driver") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Drivers are allowed to submit documents here.",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Ensure tmp directory exists
    const tmpDir = "./tmp";
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir);
    }

    // Check if documents are provided
    if (!req.files || !req.files.document) {
      return res.status(400).json({
        success: false,
        message: "No documents provided for upload.",
      });
    }

    const documents = Array.isArray(req.files.document)
      ? req.files.document
      : [req.files.document];

    const docNames = Array.isArray(req.body.docName)
      ? req.body.docName
      : [req.body.docName];

    const uploadedDocuments = await Promise.all(
      documents.map(async (doc, index) => {
        try {
          const myCloud = await cloudinary.v2.uploader.upload(doc.tempFilePath, {
            folder: "TandT/DriverDocuments",
            resource_type: "auto",
          });

          return {
            docName: docNames[index] || `Document ${index + 1}`,
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
            uploadedAt: new Date(),
          };
        } catch (uploadError) {
          console.error(`Failed to upload document ${doc.name}:`, uploadError);
          throw uploadError;
        }
      })
    );

    user.driverDocuments.push(...uploadedDocuments);
    user.isDocumentSubmited = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Documents uploaded successfully.",
      data: user.driverDocuments,
    });
  } catch (error) {
    console.error("Error in driverVerification:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while uploading documents.",
    });
  }
};

export const getMyCabs = async (req, res, next) => {
  try {
    if(req.user.role !== "Driver" && req.user.role !=="Admin"){
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Drivers are allowed to get cabs.",
      });
    }
    const cabs = await Cab.find({ belongsTo: req.user._id })
     .populate({ path: "belongsTo", select: "name" })
     .select("-__v")
     .lean();
    res.status(200).json({
      success: true,
      length:cabs.length,
      cabs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred while fetching bookings.' });
  }
  
};


export const getDriverBooking = async (req, res, next) => {
    try {

        const driverId = req.user._id;

        const driverCabs = await Cab.find({ belongsTo: driverId });

        if (driverCabs.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No cabs found for this driver"
            });
        }

        // Get the IDs of the driver's cabs
        const cabIds = driverCabs.map(cab => cab._id);

        const driverBookings = await Order.find({
            bookedCab: { $in: cabIds },
            bookingStatus: 'Confirmed'
        }).populate('userId', 'name email')
          .populate('bookedCab', 'modelName cabNumber')
          .sort({ departureDate: 1 }); 

        res.status(200).json({
            success: true,
            count: driverBookings.length,
            bookings: driverBookings
        });
    } catch (error) {
        next(error);
    }
};