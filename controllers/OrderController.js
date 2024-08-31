import { Order } from "../models/OrderModel.js";
import { instance } from "../server.js";
import { Payment } from "../models/PaymentModel.js";
import crypto from "node:crypto";
import NodeCache from "node-cache";
import { Cachestorage } from "../app.js";
import OrderServices from "../operations/OrderServices.js";

//pending_orders
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
      dropOffDate,
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
    const expireMinutes = parseInt(process.env.ORDER_EXPIRE, 10) || 15; // Default to 15 minutes if not set
    const orderExpireDate = paymentMethod === 'Cash' ? null : new Date(Date.now() + expireMinutes * 60 * 1000);
    const orderOptions = {
      userId,
      bookingType,
      bookedCab,
      exactLocation,
      departureDate,
      dropOffDate,
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
      order_expire: orderExpireDate,
    };

    const cashOptions = {
      ...orderOptions,
      order_expire: null,
    };

    Cachestorage.del(['pending_orders', 'all_bookings']);

    let order;

    if (paymentMethod === 'Hybrid' || paymentMethod === 'Online') {
      order = await Order.create(orderOptions);
    } else if (paymentMethod === 'Cash') {
      order = await Order.create(cashOptions)
    }

    res.status(201).json({
      success: true,
      order,
      amountToPay: amountToPay / 100,// Convert back to rupees for client
      razorpayOrderId,
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

      if (order.paymentMethod === 'Hybrid') {
        order.paidAmount = Math.round(order.bookingAmount * 0.1);
        order.paymentStatus = 'Partially-Paid';
        order.order_expire = null;
      } else if (order.paymentMethod === 'Online') {
        order.paidAmount = order.bookingAmount;
        order.paymentStatus = 'Paid';
        order.order_expire = null;
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


export const getMyBookings = async (req, res) => {
  try {

    const query = { userId: req.user._id };
    const populateField = { path: 'userId', select: 'name' };
    const selectField = '-__v';
    const sorting = { createdAt: -1 };
    const orders = await OrderServices.findOrders(query, populateField, selectField, sorting);

    res.status(200).json({
      success: true,
      orders: orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'An error occurred while fetching bookings.' });
  }
};


export const getOrderDetail = async (req, res, next) => {

  const orderCache = new NodeCache({ stdTTL: 0 });

  try {
    const cachedOrder = orderCache.get(req.params.id);
    if (cachedOrder) {
      return res.status(200).json({
        success: true,
        order: cachedOrder,
      })
    }
    const query = { _id: req.params.id };
    const order = await OrderServices.findOrders(query);
    // const order =  await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order Not found",
      })
    }
    orderCache.set(req.params.id, order);
    res.status(200).json({
      success: true,
      order,
    })
  } catch (error) {
    next(error);
  }
}

export const getAllPendingOrder = async (req, res, next) => {
  try {
    Cachestorage.del('pending_orders');
    if (req.user.role !== "Driver" && req.user.role !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Drivers are allowed to register their car here.",
      });
    }

    let orders;
    if (Cachestorage.has('pending_orders')) {
      orders = JSON.parse(Cachestorage.get('pending_orders'));
    } else {
      const query = { bookingStatus: 'Pending' }
      orders = await OrderServices.findOrders(query);
      const cacheKey = 'pending_orders';
      Cachestorage.set(cacheKey, JSON.stringify(orders));
    }
    if (orders.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No Order Found",
      })
    }
    res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching pending orders",
      error: error.message,
    });
  }
}