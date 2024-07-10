import { User } from "../models/UserModel.js";
import { Cab } from "../models/cabModel.js";
import { sendMail } from "../utils/sendEmail.js";
import { Cachestorage } from "../app.js";

export const setRateForCab = async (req, res) => {
    try {
        // Check if the user is an admin
        if (req.user.role !== "Admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admins are allowed to set cab rates.",
            });
        }

        const  rate  = req.body.rate;
        const cabId = req.params.id;

        // Validate inputs
        if (!cabId || !rate) {
            return res.status(400).json({
                success: false,
                message: "Cab ID and rate are required.",
            });
        }
        const rateStatus =  await Cab.findByIdAndUpdate(
            cabId,
            { 
                rate: 0,
                isReady: false 
            },
            { new: true, runValidators: true }
        )
        if (isNaN(rate) || rate <= 0) {
            return res.status(400).json({
                rateStatus,
                message: "Visibility Removed.",
            });
        }

        // Find the cab and update its rate and isReady status
        const updatedCab = await Cab.findByIdAndUpdate(
            cabId,
            { 
                rate: rate,
                isReady: true 
            },
            { new: true, runValidators: true }
        );

        if (!updatedCab) {
            return res.status(404).json({
                success: false,
                message: "Cab not found.",
            });
        }

        // Optionally, you can send an email to the cab owner
        const cabOwner = await User.findById(updatedCab.belongsTo);
        if (cabOwner) {
            const emailContent = `The rate for your cab "${updatedCab.modelName}" has been set Your cab is now ready for bookings.`;
            await sendMail(cabOwner.email, "Cab Rate Set and Ready for Bookings", emailContent);
        }
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

export const allCabs = async (req, res) => {
    try {
        if(req.user.role !== "Admin"){
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admins are allowed to Use this Route.",
            });
        }
        let cabs;
        if(Cachestorage.has("all_cabs")){
            cabs = JSON.parse(Cachestorage.get("all_cabs"));
        }else{
            cabs  =  await Cab.find();
            const cacheKey = "all_cabs";
            Cachestorage.set(cacheKey,JSON.stringify(cabs));
        }
        

        res.status(200).json({
            success: true,
            count: cabs.length,
            data : cabs,
          });
    } catch (error) {
      throw new Error('Error fetching cabs: ' + error.message);
    }
  };
  
  