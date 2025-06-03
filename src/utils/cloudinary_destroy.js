import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary with your credentials
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Deletes an image from Cloudinary by its public ID.
 * @param {string} publicId - The public ID of the image to delete.
 * @returns {Promise<object>} - The result from Cloudinary.
 */
async function destroyOnCloudinary(publicId) {
    // if (!publicId) {
    //     throw new Error("Public ID is required to delete an image.");
    // }
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        throw new Error(`Failed to delete image: ${error.message}`);
    }
}

export { destroyOnCloudinary };
