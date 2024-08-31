import cloudinary from "cloudinary";
import fs from "fs";
import userServices from "./UserServices.js";
import { Cab } from "../models/CabModel.js";
import UserServices from "./UserServices.js";

class CabServices {
    async uploadCabImages(photos) {
        try {
            const imagePromises = photos.map(async (image) => {
                const myCloud = await cloudinary.v2.uploader.upload(image.tempFilePath, {
                    folder: "TandT/Cars",
                    resource_type: "image",
                });

                return {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url,
                };
            });

            return await Promise.all(imagePromises);
        } catch (error) {
            console.error("Error uploading images:", error);
            throw new Error("Error uploading images");
        }
    }

    async registerCab(userId, carData, uploadedImages) {
        try {
            const car = await Cab.create({
                ...carData,
                belongsTo: userId,
                photos: uploadedImages,
            });

            // Update user's haveCab field
            await this.updateUserHaveCabStatus(userId, true);

            return car;
        } catch (error) {
            console.error("Error registering cab:", error);
            throw new Error("Error registering cab");
        }
    }

    async removeTmpDir(tmpDir) {
        try {
            if (fs.existsSync(tmpDir)) {
                fs.rmSync(tmpDir, { recursive: true });
            }
        } catch (error) {
            console.error("Error removing temporary directory:", error);
            throw new Error("Error removing temporary directory");
        }
    }
    async updateUserHaveCabStatus(userId, status) {
        try {
            const user = await userServices.findUserById(userId);
            if (!user) {
                throw new Error('User not found');
            }
            user.haveCab = status;
            await user.save();
            return user;
        } catch (error) {
            console.error('Error updating user haveCab status:', error);
            throw new Error('Error updating user haveCab status');
        }
    }
    async findCabById(cabId) {
        try {
            const cab = await Cab.findById(cabId);
            if (!cab) {
                throw new Error('Cab not found');
            }
            return cab;
        } catch (error) {
            console.error('Error finding cab:', error);
            throw new Error('Error finding cab');
        }
    }
    async findCabs(query = {}) {
        try {
            if (query.hasOwnProperty('_id')) {
                const cab = await Cab.findById(query._id);
                return cab;
            } else {
                const cabs = await Cab.find(query).lean();
                return cabs;
            }
        } catch (error) {
            console.error('Error finding cabs:', error);
            throw new Error('Error finding cabs');
        }
    }
    async updateCab(cabId, cabData, uploadedImages) {
        try {
            const updatedCab = await Cab.findByIdAndUpdate(
                cabId,
                { ...cabData, photos: uploadedImages },
                { new: true, runValidators: true }
            );
            if (!updatedCab) {
                throw new Error('Cab not found');
            }
            return updatedCab;
        } catch (error) {
            console.error('Error updating cab:', error);
            throw new Error('Error updating cab');
        }
    }
    async deleteOldImages(cab) {
        try {
            for (let i = 0; i < cab.photos.length; i++) {
                await cloudinary.v2.uploader.destroy(cab.photos[i].public_id);
            }
        } catch (error) {
            console.error('Error deleting old images:', error);
            throw new Error('Error deleting old images');
        }
    }
    async deleteCabfromdb(Id){
        try {
            const cabToBeDlt = await Cab.findById(Id).lean();
            if(cabToBeDlt.belongsTo){
                const cabOwner = UserServices.findUserById(cabToBeDlt.belongsTo);
                cabOwner.haveCab = false;
            }
            
        } catch (error) {
            
        }
    }
}




export default new CabServices();