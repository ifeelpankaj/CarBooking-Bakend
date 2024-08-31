
import cloudinary from "cloudinary";
import UserServices from "./UserServices.js"; // Updated import path
import CabServices from "./CabServices.js";

class DriverService {
  constructor() {
    this.userService = UserServices;
    this.cabService = CabServices;
  }



  async verifyAndUploadDocuments(userId, documents, docNames) {
    try {
      // Find the user by ID
      const driver = await this.userService.findUserById(userId);
      if (!driver) {
        throw new Error('Driver not found.');
      }

      // Upload documents to Cloudinary
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

      // Update user's driver documents and save
      driver.driverDocuments.push(...uploadedDocuments);
      driver.isDocumentSubmited = true;
      await driver.save();

      return driver.driverDocuments;
    } catch (error) {
      console.error('Error verifying and uploading documents:', error);
      throw new Error('An error occurred while uploading documents.');
    }
  }
}

export default new DriverService();