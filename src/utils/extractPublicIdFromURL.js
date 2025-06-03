import { v2 as cloudinary } from "cloudinary";
import { ApiError } from "./ApiError.js";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const extractPublicIdFromURL = (url) => {
    try {
        const parts = url.split("/");
        const fileWithExt = parts.pop(); // 'sample.jpg'
        const version = parts.pop(); // 'v1620000000'
        const folder = parts.slice(parts.indexOf("upload") + 1).join("/"); // 'folder'
        const publicId = `${folder}${fileWithExt.split(".")[0]}`; // 'folder/sample'

        return publicId;
    } catch (error) {
        throw new ApiError(
            "Failed to extract public ID from URL",
            500,
            error?.message || error
        );
    }
};

export { extractPublicIdFromURL };
