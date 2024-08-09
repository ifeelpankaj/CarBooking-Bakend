import cloudinary from "cloudinary";
import { User } from "../models/UserModel.js";
import { existsSync, mkdirSync } from "fs";

import { Order } from "../models/OrderModel.js";
import { Cab } from "../models/cabModel.js";
import { Cachestorage } from "../app.js";



export const driverVerification = async (req, res) => {
  try {
    Cachestorage.del(['all_user','all_drivers'])
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
    if (req.user.role !== "Driver" && req.user.role !== "Admin") {
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
      length: cabs.length,
      cabs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred while fetching bookings.' });
  }

};


export const getDriverBooking = async (req, res, next) => {
  try {

    if (req.user.role !== "Driver" && req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Drivers and Admins are allowed to get cabs.",
      });
    }

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

    // Fetch all relevant bookings
    const allDriverBookings = await Order.find({
      bookedCab: { $in: cabIds },
      bookingStatus: { $in: ['Assigning', 'Confirmed', 'Completed'] },
    }).populate('userId', 'name email')
      .populate('bookedCab', 'modelName cabNumber')
      .sort({ departureDate: 1 });

    // Separate bookings into two arrays
    const assigningBookings = allDriverBookings.filter(booking => booking.bookingStatus === 'Assigning');
    const confirmedBookings = allDriverBookings.filter(booking => booking.bookingStatus === 'Confirmed');
    const completedBookings = allDriverBookings.filter(booking => booking.bookingStatus === 'Completed');

    res.status(200).json({
      success: true,
      assigningCount: assigningBookings.length,
      confirmedCount: confirmedBookings.length,
      completeCount: completedBookings.length,
      data: {
        assigning: assigningBookings,
        confirmed: confirmedBookings,
        completed: completedBookings,
      }
    });
  } catch (error) {
    next(error);
  }
};

export const confirmBooking = async (req, res, next) => {
  try {
    if (req.user.role !== "Driver" && req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Drivers are allowed.",
      });
    }

    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required to confirm the booking" });
    }

    const order = await Order.findByIdAndUpdate(
      orderId,
      { bookingStatus: 'Confirmed' },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(400).json({ message: "Unable to find a cab" });
    }
    Cachestorage.del(['pending_orders','all_bookings']);
    res.status(200).json({
      success: true,
      message: "Booking confirmed successfully",
      data: order
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: "An error occurred while confirming the booking" });
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    if (req.user.role !== "Driver" && req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Drivers and Admins are allowed.",
      });
    }

    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required to cancel the booking" });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    Cachestorage.del(['pending_orders,all_cabs,all_bookings']);

    // Find the cab associated with the order and remove the booking
    if (order.bookedCab) {
      const cab = await Cab.findById(order.bookedCab);
      if (cab) {
        cab.removeBooking(orderId);
        await cab.save();
      }
    } else {
      return res.status(404).json({ message: "Error updating upcoming details of cab" });
    }

    // Update the order status and remove all driver-related information
    order.bookingStatus = 'Pending';
    order.driverId = undefined;
    
    // Remove the entire driverShare array and related fields
    order.driverShare = undefined;
    order.driverCut = undefined;
    order.driverStatus = undefined;
    // Add any other driver-related fields you want to remove

    // Use $unset to remove fields from the document
    await Order.updateOne({ _id: orderId }, { 
      $unset: { 
        driverShare: "",
        driverCut: "",
        driverStatus: "",
        // Add any other fields you want to remove
      }
    });

    await order.save();

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully and driver information removed",
      data: order
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: "An error occurred while cancelling the booking" });
  }
};

export const completeBooking = async (req, res, next) => {
  try {
    if (req.user.role !== "Driver" && req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Drivers are allowed.",
      });
    }
    Cachestorage.del(['pending_orders,all_cabs,all_bookings']);

    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Booking ID is required to complete the booking" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (order.bookedCab) {
      const cab = await Cab.findById(order.bookedCab);
      if (cab) {
        cab.removeBooking(orderId);
        await cab.save();
      }
    } else {
      return res.status(404).json({ message: "Error updating upcoming details of cab" });
    }
    if (new Date(order.departureDate) > new Date()) {
      return res.status(404).json({ message: "NaN.. Booking connot be completed !!!" });
    }
    order.bookingStatus = 'Completed';
    await order.save();
    res.status(200).json({
      success: true,
      message: "Congrate booking is completed successfully",
      data: order
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: "An error occurred while confirming the booking" });
  }
};

