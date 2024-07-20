import { Order } from "../models/OrderModel.js";
import { instance } from "../server.js";
import {Payment} from "../models/PaymentModel.js";
import  crypto from "node:crypto";
import NodeCache from "node-cache";

export const bookCab = async (req, res, next) => {
  

  function generateNumericOTP(length) {
    let digits = '123456789';
    let otp = 0; // Initialize otp as a number

    for (let i = 0; i < length; i++) {
      otp *= 10; // Shift existing digits to the left
      otp += parseInt(digits[Math.floor(Math.random() * digits.length)], 10); // Add new digit as a number
    }

    return `Cash_${otp}`;
  }
  try {
    const {
      bookingType,
      bookedCab,
      exactLocation,
      departureDate,
      pickupLocation,
      destination,
      numberOfPassengers,
      bookingStatus,
      paymentMethod,
      passengers,
      bookingAmount,
    } = req.body;

    const userId = req.user._id;
    let razorpayOrderId = "";
    let amountToPay = 0;

    if (paymentMethod === 'Hybrid') {
      amountToPay = Math.round(bookingAmount * 0.1 * 100); // 10% of booking amount in paise
    } else if (paymentMethod === 'Online') {
      amountToPay = Math.round(bookingAmount * 100); // Full amount in paise
    }

    if (paymentMethod === 'Hybrid' || paymentMethod === 'Online') {
      const options = {
        amount: amountToPay,
        currency: "INR",
        receipt: `order_${new Date().getTime()}`,
      };
      const razorpayOrder = await instance.orders.create(options);
      razorpayOrderId = razorpayOrder.id;
    } else if (paymentMethod === 'Cash') {
      razorpayOrderId = generateNumericOTP(9);
    }

    const orderOptions = {
      userId,
      bookingType,
      bookedCab,
      exactLocation,
      departureDate,
      pickupLocation,
      destination,
      numberOfPassengers,
      bookingStatus,
      paymentMethod,
      paymentStatus: 'Pending',
      passengers,
      bookingAmount,
      paidAmount: 0, // Initialize as 0, update after successful payment
      razorpayOrderId,
    };

    const order = await Order.create(orderOptions);


    res.status(201).json({
      success: true,
      order,
      amountToPay: amountToPay / 100, // Convert back to rupees for client
    });
  } catch (error) {
    console.error("Error in bookCab:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const paymentVerification = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_API_SECRET);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);

    const expectedSignature = hmac.digest('hex');
    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      await Payment.create({
        order: order._id,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      order.paymentStatus = 'Paid';
      if (order.paymentMethod === 'Hybrid') {
        order.paidAmount = order.bookingAmount * 0.1;
      } else if (order.paymentMethod === 'Online') {
        order.paidAmount = order.bookingAmount;
      }
      await order.save();

      res.status(200).json({
        success: true,
        message: "Payment verified and order updated successfully",
        order,
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }
  } catch (error) {
    console.error("Error in paymentVerification:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


export const getMyBookings = async (req, res, next) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
     .populate({ path: "userId", select: "name" })
     .select("-__v")
     .lean();
    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred while fetching bookings.' });
  }
  
};

export const getOrderDetail = async(req,res,next)=>{
  const orderCache = new NodeCache({ stdTTL: 300 });
  try {
    const cachedOrder = orderCache.get(req.params.id);
    if(cachedOrder){
      return res.status(200).json({
        success:true,
        order:cachedOrder,
      })
    }

    const order = await Order.findById(req.params.id).lean();
    if(!order){
      return res.status(404).json({
        success:false,
        message:"Order Not found",
      })
    }
    orderCache.set(req.params.id,order);
    res.status(200).json({
      success:true,
      order,
    })
  } catch (error) {
    next(error);
  }
}