import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function safeUnlink(localFilePath) {
    if (localFilePath && fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
    }
}

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;
        const result = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto',
        });
        safeUnlink(localFilePath);
        return result;
    } catch (error) {
        safeUnlink(localFilePath);
        console.error("Error uploading to Cloudinary:", error);
        throw error;
    }
}

export { uploadOnCloudinary };