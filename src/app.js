// app.js

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// app.use(
//     cors({
//         origin: function (origin, callback) {
//             const allowedOrigins = [
//                 process.env.CORS_ORIGIN,
//                 "video-streaming-application-theta.vercel.app",
//             ];
//             if (!origin || allowedOrigins.includes(origin)) {
//                 callback(null, true);
//             } else {
//                 callback(new Error("Not allowed by CORS"));
//             }
//         },
//         credentials: true,
//     })
// );

const allowedOrigins = [
    "http://localhost:5173", // local dev
    "video-streaming-application-theta.vercel.app", // production frontend
    "", // if hosting frontend on Render
];

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin || !allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
    })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// --- Routes Import ---
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import commentRouter from "./routes/comment.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import healthcheckRouter from "./routes/healthCheck.routes.js";
import likeRouter from "./routes/like.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

// --- Routes Declaration ---
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);
// NOTE: Best practice is to use plural names for routes, like "/api/v1/playlists".
// Kept as singular to match your existing setup.
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/dashboard", dashboardRouter);

export { app };
