import { User } from "../models/UserModel.js";
import { Cab } from "../models/cabModel.js";
import { sendMail } from "../utils/sendEmail.js";
import { Cachestorage } from "../app.js";
import { Order } from "../models/OrderModel.js";
//all_cabs,all_bookings,all_user,all_drivers

//Cab section
export const allCabs = async (req, res) => {
    try {

        if (req.user.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admins are allowed to Use this Route.",
            });
        }
        let cabs;
        if (Cachestorage.has("all_cabs")) {
            cabs = JSON.parse(Cachestorage.get("all_cabs"));
        } else {
            cabs = await Cab.find().sort({ createdAt: -1 });;
            const cacheKey = "all_cabs";
            Cachestorage.set(cacheKey, JSON.stringify(cabs));
        }


        res.status(200).json({
            success: true,
            count: cabs.length,
            data: cabs,
        });
    } catch (error) {
        throw new Error('Error fetching cabs: ' + error.message);
    }
};

export const setRateForCab = async (req, res) => {
    try {

        if (req.user.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admins are allowed to set cab rates.",
            });
        }

        const rate = req.body.rate;
        const cabId = req.params.id;

        if (!cabId || !rate) {
            return res.status(400).json({
                success: false,
                message: "Cab ID and rate are required.",
            });
        }

        if (isNaN(rate) || rate <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid rate. Rate must be a positive number.",
            });
        }

        const updatedCab = await Cab.findById(cabId);

        if (!updatedCab) {
            return res.status(404).json({
                success: false,
                message: "Cab not found.",
            });
        }
        updatedCab.rate = rate;
        await updatedCab.save();

        //  send an email to the cab owner
        const cabOwner = await User.findById(updatedCab.belongsTo);
        if (cabOwner) {
            const emailContent = `The rate for your cab "${updatedCab.modelName}" has been set. Your cab is now ready for bookings.`;
            await sendMail(cabOwner.email, "Cab Rate Set and Ready for Bookings", emailContent);
        }

        // Clear cache for cabs
        Cachestorage.del(['all_cabs', 'all_cabs_user']);

        res.status(200).json({
            success: true,
            message: "Cab rate set successfully and is now ready for bookings.",
            cab: updatedCab,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error setting cab rate",
            error: error.message,
        });
    }
};
///Users 
export const allUser = async (req, res) => {
    try {
        if (req.user.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admins are allowed to Use this Route.",
            });
        }
        let user;
        if (Cachestorage.has("all_user")) {
            user = JSON.parse(Cachestorage.get("all_user"));
        } else {
            user = await User.find().sort({ createdAt: 1 });;
            const cacheKey = "all_user";
            Cachestorage.set(cacheKey, JSON.stringify(user));
        }


        res.status(200).json({
            success: true,
            count: user.length,
            data: user,
        });
    } catch (error) {
        throw new Error('Error fetching cabs: ' + error.message);
    }
};

export const allDrivers = async (req, res) => {
    try {

        if (req.user.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admins are allowed to Use this Route.",
            });
        }
        let driver;
        if (Cachestorage.has("all_drivers")) {
            driver = JSON.parse(Cachestorage.get("all_drivers"));
        } else {
            driver = await User.find({ role: "Driver" }).sort({ createdAt: 1 });;
            const cacheKey = "all_drivers";
            Cachestorage.set(cacheKey, JSON.stringify(driver));
        }


        res.status(200).json({
            success: true,
            count: driver.length,
            data: driver,
        });
    } catch (error) {
        throw new Error('Error fetching cabs: ' + error.message);
    }
};

export const getAvailableCabs = async (req, res) => {

    try {
        if (req.user.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admins are allowed to Use this Route.",
            });
        }
        const { capacity, date } = req.body;

        if (!capacity || !date) {
            return res.status(400).json({ success: false, message: 'Capacity and date are required' });
        }

        const requestDate = new Date(date);

        // Find all cabs that match the specified capacity
        const potentialCabs = await Cab.find({
            capacity: capacity,
        }).populate({
            path: 'belongsTo',
            select: 'username email phoneNumber isVerifiedDriver',
            match: { isVerifiedDriver: true }
        });

        // Filter cabs with verified drivers and check availability
        const availableCabs = potentialCabs.filter(cab => {
            if (!cab.belongsTo) return false; // Filter out cabs with unverified drivers

            // Check if the cab is available on the requested date
            const isAvailable = cab.upcomingBookings.every(booking => {
                const bookingDate = new Date(booking.departureDate);
                const timeDifference = Math.abs(bookingDate - requestDate) / (1000 * 60 * 60); // difference in hours
                return timeDifference >= 24;
            });

            return isAvailable;
        }).map(cab => ({
            cabId: cab._id,
            modelName: cab.modelName,
            type: cab.type,
            capacity: cab.capacity,
            feature: cab.feature,
            cabNumber: cab.cabNumber,
            rate: cab.rate,
            driver: {
                name: cab.belongsTo.username,
                email: cab.belongsTo.email,
                phoneNumber: cab.belongsTo.phoneNumber
            }
        }));

        res.status(200).json({
            success: true,
            count: availableCabs.length,
            data: availableCabs
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

export const getCabById = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the cab by ID and populate the belongsTo field
        const cab = await Cab.findById(id).populate({
            path: 'belongsTo',
            select: 'username email phoneNumber isVerifiedDriver'
        });

        if (!cab) {
            return res.status(404).json({
                success: false,
                message: 'Cab not found'
            });
        }

        res.status(200).json({
            success: true,
            data: cab
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
//Bookings
export const allBookings = async (req, res) => {
    try {

        if (req.user.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admins are allowed to Use this Route.",
            });
        }
        let bookings;
        if (Cachestorage.has("all_bookings")) {
            bookings = JSON.parse(Cachestorage.get("all_bookings"));
        } else {
            bookings = await Order.find().sort({ createdAt: -1 });;
            const cacheKey = "all_bookings";
            Cachestorage.set(cacheKey, JSON.stringify(bookings));
        }

        res.status(200).json({
            success: true,
            count: bookings.length,
            data: bookings,
        });
    } catch (error) {
        throw new Error('Error fetching cabs: ' + error.message);
    }
};

export const updateBookedCab = async (req, res) => {
    if (req.user.role !== "Admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Only Admins are allowed to use this Route.",
        });
    }

    const { id } = req.params;
    const { newCabId, departureDate, dropOffDate, driverCut } = req.body;

    if (!id || !newCabId || !departureDate) {
        return res.status(400).json({ message: "Order ID, new Cab ID, and departure date are required" });
    }

    try {
        // Validate that the new cab exists
        const cab = await Cab.findById(newCabId);
        if (!cab) {
            return res.status(404).json({ message: "The specified new cab does not exist" });
        }

        const driverId = cab.belongsTo;

        // Find the order and update it
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        order.driverId = driverId;
        order.driverShare = [{ driverCut: driverCut }];
        order.bookedCab = newCabId;
        order.bookingStatus = 'Assigning';
        order.departureDate = new Date(departureDate);
        if (dropOffDate) {
            order.dropOffDate = new Date(dropOffDate);
        }

        await order.save();

        // Update the cab's bookings
        cab.addBooking(id, order.departureDate, order.dropOffDate);
        cab.updateUpcomingBookings();
        const result = await cab.save();
        if(!result){
            res.status(404).json({ message: "Error with assigning the cab"});
        }
        
        // Clear cache
       
            Cachestorage.del(['all_bookigs','all_cabs','driver_cabs','pending_orders']);
        

        res.status(200).json({
            message: "Cab assigned successfully",
            order: order,
            cab: cab
        });
    } catch (error) {
        console.error('Error updating booked cab:', error);
        res.status(500).json({ message: "An error occurred while updating the booked cab" });
    }
};

export const getUserById = async (req, res) => {
    try {


        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "ID is required" });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {

        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDriverInfoById = async (req, res) => {
    try {
        if (req.user.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admins are allowed to use this Route.",
            });
        }
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "Driver ID is required" });
        }

        const driver = await User.findOne({ _id: id, role: "Driver" });

        if (!driver) {
            return res.status(404).json({ success: false, message: "Driver not found" });
        }

        // Find the cab associated with this driver
        const cab = await Cab.findOne({ belongsTo: id });

        if (!cab) {
            return res.status(404).json({ success: false, message: "No cab found for this driver" });
        }

        // Update upcoming bookings
        cab.updateUpcomingBookings();
        await cab.save();

        const driverInfo = {
            _id: driver._id,
            username: driver.username,
            email: driver.email,
            phoneNumber: driver.phoneNumber,
            isVerified: driver.isVerified,
            isVerifiedDriver: driver.isVerifiedDriver,
            isDocumentSubmited: driver.isDocumentSubmited,
            driverDocuments: driver.driverDocuments,
            haveCab: driver.haveCab,
            avatar: driver.avatar,
            createdAt: driver.createdAt,
            cab: {
                cabId:cab._id,
                modelName: cab.modelName,
                type: cab.type,
                capacity: cab.capacity,
                feature: cab.feature,
                cabNumber: cab.cabNumber,
                availability: cab.availability,
                rate: cab.rate,
                isReady: cab.isReady,
                photos: cab.photos,
                upcomingBookings: cab.upcomingBookings,
                pastBookings: cab.pastBookings  // Added pastBookings
            }
        };

        res.status(200).json({ success: true, driver: driverInfo });
    } catch (error) {
        console.error("Error in getDriverInfoById:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const verifyDriver = async (req, res) => {
    try {

        if (req.user.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admins are allowed to use this route.",
            });
        }
        Cachestorage.del(['all_user','all_drivers'])
        const { id } = req.params;
        const { flag } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Driver ID is required." });
        }

        if (typeof flag !== 'boolean') {
            return res.status(400).json({ success: false, message: "Flag is required and must be a boolean." });
        }
        const driver = await User.findOne({ _id: id, role: "Driver" });

        if (!driver) {
            return res.status(404).json({ success: false, message: "Driver not found." });
        }

        if (!driver.haveCab) {
            return res.status(400).json({ success: false, message: "Driver has no car registered." });
        }

        if (!driver.isDocumentSubmited) {
            return res.status(400).json({ success: false, message: "Driver has not submitted the necessary documents." });
        }

        // Verify the driver
        const updatedDriver = await User.findByIdAndUpdate(
            id,
            { isVerifiedDriver: flag },
            { new: true, runValidators: true }
        );

        if (!updatedDriver) {
            return res.status(500).json({ success: false, message: "Error in verifying the driver." });
        }

        res.status(200).json({
            success: true,
            message: flag ? "Driver is verified and now we can assign bookings to this driver." : "Driver verification has been revoked.",
        });

    } catch (error) {
        console.error("Error in verifyDriver:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};
