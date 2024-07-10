import { Order } from "../models/OrderModel.js";
import { instance } from "../server.js";
import {Payment} from "../models/PaymentModel.js";
import  crypto from "node:crypto";

export const bookCab  = async (req, res, next) => {
  console.log("Received booking request:", req.body);
     const {
        bookingType,
        departureDate,
        pickupLocation,
        destination,
        numberOfPassengers,
        bookingStatus,
        paymentMethod,
        paymentStatus,
        passengers,
        bookingAmount
  } = req.body;

  const userId = req.user._id;

  const orderOptions = {
        userId,
        bookingType,
        departureDate,
        pickupLocation,
        destination,
        numberOfPassengers,
        bookingStatus,
        paymentMethod,
        paymentStatus,
        passengers,
        bookingAmount
  };
  let order;
  if(paymentMethod === 'Hybrid'){
    let partialAmount = bookingAmount/10;
    const options = {
        amount: Number(partialAmount) * 100,
        currency: "INR",
      };
      order = await instance.orders.create(options);
      console.log("Created Razorpay order for Hybrid payment:", order);
  }
    if(paymentMethod ==='Online'){
        // here I want razorpay option
        const options = {
            amount: Number(bookingAmount) * 100,
            currency: "INR",
          };
          order = await instance.orders.create(options);
          console.log("Created Razorpay order for Online payment:", order);
  }if(paymentMethod === 'Cash'){
        
        order = await Order.create(orderOptions);
        console.log("Created Razorpay order for Online payment:", order);
  }
 

  res.status(201).json({
    success: true,
    order,
    orderOptions,
  });
};

export const paymentVerification = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_API_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);

    const expectedSignature = hmac.digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Store payment details in the database
      await Payment.create({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      // Assuming orderOptions is passed in req.body or defined elsewhere
      const orderOptions = req.body.orderOptions;

      // Create order in the database
      const order = await Order.create({
        ...orderOptions,
        razorpayOrderId: razorpay_order_id,
        paymentStatus: 'Paid',
      });

      res.status(200).json({
        success: true,
        message: "Payment verified and order created successfully",
        order,
      });

      // Redirecting after sending the response
      res.status(200).json({
        success: true,
        message: "Payment verified and order created successfully",
        order,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
 };