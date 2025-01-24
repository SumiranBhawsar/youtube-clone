import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { console } from "inspector";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // upload the file on the cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        // file has been uploaded successfully
        console.log(
            "File has been uploaded successfully on cloudinary : ",
            response.url
        );

        return response.url;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        return null;
    }
};

export { uploadOnCloudinary };
