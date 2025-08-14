import { app } from "./app.js";
import connectDb from "./db/index.js";
import dotenv from "dotenv";

dotenv.config({
    path: "./env",
});

const __dirname = path.resolve();

// Serve static files
app.use(express.static(path.join(__dirname, "/frontend/dist")));

// ✅ Correct wildcard route
app.get("/*splat", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

connectDb()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });
    })
    .catch((err) => {
        console.log("MONGODB connection FAILED : !! ", err);
    });
