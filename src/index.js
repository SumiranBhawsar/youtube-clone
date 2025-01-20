import connectDb from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
    path: "./env"
})

connectDb();































































/*
import express from "express";

const app = express();

(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error", (err) => {
            console.log(err);
            throw err;
        });

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on ${process.env.PORT}`);
        });
    } catch (error) {
        console.error("ERROR : ", error);
        throw error;
    }
})();
*/
