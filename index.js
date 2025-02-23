require("dotenv").config(); // Load environment variables
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const admin = require("firebase-admin");
const { getStorage } = require("firebase-admin/storage");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase using the .env path
const serviceAccount = require(process.env.FIREBASE_CREDENTIALS);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});
const bucket = getStorage().bucket();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let stories = [];

// Upload story to Firebase Storage
app.post("/stories", upload.single("file"), async (req, res) => {
    try {
        let story;
        if (req.file) {
            const fileName = `stories/${Date.now()}_${req.file.originalname}`;
            const file = bucket.file(fileName);
            await file.save(req.file.buffer, { contentType: req.file.mimetype });

            // Get public URL
            const [url] = await file.getSignedUrl({ action: "read", expires: "01-01-2100" });

            console.log(`✅ Uploaded file URL: ${url}`);

            story = {
                id: Date.now(),
                type: req.file.mimetype.startsWith("image") ? "image" : "video",
                content: url,
                timestamp: Date.now(),
            };
        } else {
            story = {
                id: Date.now(),
                type: "text",
                content: req.body.text,
                timestamp: Date.now(),
            };
        }

        stories.push(story);
        console.log(`📥 New Story Added: ${story.content}`);

        res.json({ message: "Story added", story });
    } catch (error) {
        console.error("❌ Error uploading file:", error);
        res.status(500).json({ error: "Upload failed" });
    }
});

// Get all stories
app.get("/stories", (req, res) => {
    console.log("📤 Sent all stories to client");
    res.json(stories);
});

// Default route for root URL "/"
app.get("/", (req, res) => {
    res.send("🚀 Welcome to the Story API! Use /stories to upload or fetch stories.");
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running at: http://localhost:${PORT}/`);
});
