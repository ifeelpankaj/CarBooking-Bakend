
import { Cachestorage } from "../app.js";
import { Order } from "../models/OrderModel.js";
import CabServices from "./CabServices.js";

class OrderServices {

 
  async findOrders(query = {}, populateField = null, selectField = '', sorting = {}, lean = false) {
   
    try {
      if (query.hasOwnProperty('_id')) {
        const order = await Order.findById(query._id);
        return order;
      }
      let orderQuery = Order.find(query);

      if (populateField && typeof populateField === 'object') {
        orderQuery = orderQuery.populate(populateField);
      }


      if (selectField) {
        orderQuery = orderQuery.select(selectField);
      }

      if (Object.keys(sorting).length > 0) {
        orderQuery = orderQuery.sort(sorting);
      }
      if (lean) {
        orderQuery = orderQuery.lean();
      }
      const orders = await orderQuery
      return orders;
    } catch (error) {
      console.error('Error finding orders:', error);
      throw new Error('Error finding orders');
    }
  }
 
  async updateBooking(orderId, action, additionalData = {}) {
    try {
      // Find the order by ID
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
  
      // Perform different actions based on the `action` parameter
      switch (action) {
        case 'confirm':
          order.bookingStatus = 'Confirmed';
          break;
  
        case 'cancel':
          // Update the booking status
          order.bookingStatus = 'Pending';
          order.driverId = undefined;
          
          // Remove driver-related fields
          order.driverShare = undefined;
          order.driverCut = undefined;
          order.driverStatus = undefined;
          
          // Use $unset to remove fields from the document
          await Order.updateOne({ _id: orderId }, { 
            $unset: { 
              driverShare: "",
              driverCut: "",
              driverStatus: "",
              // Add any other fields you want to remove
            }
          });
  
          // If there is a booked cab, remove the booking from it
          if (order.bookedCab) {
            const cab = await CabServices.findCabs({_id:order.bookedCab});
            if (cab) {
              cab.removeBooking(orderId);
              await cab.save();
            }
          }
          break;
  
        case 'complete':
          if (new Date(order.departureDate) > new Date()) {
            throw new Error('Booking cannot be completed before departure date');
          }
          order.bookingStatus = 'Completed';
          
          // If there is a booked cab, remove the booking from it
          if (order.bookedCab) {
            const cab = await CabServices.findCabs({_id:order.bookedCab});
            if (cab) {
              cab.removeBooking(orderId);
              await cab.save();
            }
          }
          break;
  
        default:
          throw new Error('Invalid action');
      }
  
      // Save the updated order
      await order.save();
  
      // Clear the relevant cache
      Cachestorage.del(['pending_orders', 'all_cabs', 'all_bookings']);
  
      return order;
    } catch (error) {
      console.error('Error updating booking:', error);
      throw new Error(error.message || 'An error occurred while updating the booking');
    }
  }
}

export default new OrderServices();