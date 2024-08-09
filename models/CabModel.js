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

const bookingSchema = new mongoose.Schema({
  orderId: {
    type: String,
    // required: true,
  },
  departureDate: {
    type: Date,
    // required: true,
  },
  dropOffDate: {
    type: Date,
    // required: true,
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Past', 'Cancelled'],
    default: 'Upcoming'
  }
});

const cabSchema = new mongoose.Schema({
  modelName: {
    type: String,
    required: true,
  },
  type: {
    type: String,
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
  cabNumber: {
    type: String,
    required: true,
  },
  availability: {
    type: String,
    enum: ["Available", "Booked"],
    default: "Available",
  },
  rate: {
    type: Number,
  },
  isReady: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  upcomingBookings: [bookingSchema],
  pastBookings: [bookingSchema] // New array for past bookings
});

cabSchema.methods.updateUpcomingBookings = function() {
  const now = new Date();
  const pastBookings = [];
  
  this.upcomingBookings = this.upcomingBookings.filter(booking => {
    if (booking.departureDate <= now) {
      booking.status = 'Past';
      pastBookings.push(booking);
      return false;
    }
    return true;
  });

  // Add the past bookings to the pastBookings array
  this.pastBookings.push(...pastBookings);
};

cabSchema.methods.addBooking = function(orderId, departureDate, dropOffDate) {
  const newBooking = {
    orderId,
    departureDate,
    dropOffDate,
    status: 'Upcoming'
  };
  
  this.upcomingBookings.push(newBooking);
  this.updateUpcomingBookings();
};
cabSchema.methods.removeBooking = function(orderId) {
  this.upcomingBookings = this.upcomingBookings.filter(booking => booking.orderId !== orderId);
  this.pastBookings = this.pastBookings.filter(booking => booking.orderId !== orderId);

};
export const Cab = mongoose.models.Cab || mongoose.model("Cab", cabSchema);