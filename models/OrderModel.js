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
        required: true,
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
    dropOffDate: {
        type: Date,
        // required: true
    },
    pickupLocation: {
        type: String,
        required: true
    },
    exactLocation:{
        type:String
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
        enum: ['Pending', "Assigning",'Confirmed', 'Completed', 'Cancelled'],
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
    paidAmount:{
        type:Number
    },
    driverShare:[{
        driverCut: {
            type: Number,
        },
        Via:{
            type:String,
        },
        status:{
            type: String,
            default: "UnPaid",
        },
        paidAt: {
            type: Date,
            default: Date.now,
        },  
    }],
    driverId:{
        type: mongoose.Schema.ObjectId,
        ref: "User",
    },
    razorpayOrderId: {
        type: String,
    },
    order_expire:Date,

    createdAt: {
        type: Date,
        default: Date.now,
    },  
});
// orderSchema.pre('save', async function(next) {
//     if (this.isNew || (this.paymentStatus === 'Pending' && (this.paymentMethod === 'Online' || this.paymentMethod === 'Hybrid'))) {
//       try {
//         // Update Order
//         const updatedOrders = await Order.updateMany(
//           {
//             _id: { $ne: this._id },
//             paymentStatus: 'Pending',
//             paymentMethod: { $in: ['Online', 'Hybrid'] }
//           },
//           {
//             $set: {
//               paymentStatus: 'Failed',
//               bookingStatus: 'Cancelled'
//             }
//           }
//         );
//         console.log(`Updated ${updatedOrders.modifiedCount} orders.`);
//       } catch (error) {
//         console.error('Error updating unpaid orders:', error);
//         return next(error);
//       }
//     }
//     return next();
//   });

  // orderSchema.methods.checkBooking = async function(next) {
  //   try {
  //     // Update orders
  //     const updatedOrders = await Order.updateMany(
  //       {
  //         _id: { $ne: this._id },
  //         paymentStatus: 'Pending',
  //         paymentMethod: { $in: ['Online', 'Hybrid'] }
  //       },
  //       {
  //         $set: {
  //           paymentStatus: 'Failed',
  //           bookingStatus: 'Cancelled'
  //         }
  //       }
  //     );
  //   //   console.log(`Updated ${updatedOrders.modifiedCount} orders.`);
  //   } catch (error) {
  //     console.error('Error updating unpaid orders:', error);
  //     if (next) {
  //       return next(error);
  //     }
  //   }
  // };

  orderSchema.index({ order_expire: 1 }, { expireAfterSeconds: 0 });
  export const Order = mongoose.model("Order", orderSchema);