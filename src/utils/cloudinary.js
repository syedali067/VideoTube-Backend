import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto', // This will allow uploading any type of file
        });
        console.log("File uploaded to Cloudinary successfully:", result);
        console.log("Cloudinary upload result:", result.url);
        fs.unlinkSync(localFilePath); // Delete the temporary file
        return result;
    } catch (error) {
        fs.unlinkSync(localFilePath); // Delete the temporary file
        console.error("Error uploading to Cloudinary:", error);
        throw error;
        return null;
    }
}

export { uploadOnCloudinary };