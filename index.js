require("dotenv").config();
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const admin = require("firebase-admin");
const { Storage } = require('@google-cloud/storage');

const app = express();
app.use(cors());
app.use(express.json());

// Load Firebase credentials from the environment variable
const serviceAccountJSON = process.env.FIREBASE_CREDENTIALS;

if (!serviceAccountJSON) {
    throw new Error("❌ Firebase credentials not found in environment variables");
}

// Parse the JSON string into an object
const serviceAccount = JSON.parse(serviceAccountJSON);

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "valute3.appspot.com",  // Replace with your Firebase project storage bucket
});

const storage = new Storage();
const bucket = storage.bucket("valute3.appspot.com");  // Replace with your Firebase project storage bucket

// Set up Multer to handle file uploads
const multerStorage = multer.memoryStorage();
const upload = multer({ storage: multerStorage });

let stories = [];

// Route to upload a new story (image, video, or text)
app.post("/stories", upload.single("file"), async (req, res) => {
    try {
        const story = {
            id: Date.now(),
            type: req.file ? (req.file.mimetype.startsWith("image") ? "image" : "video") : "text",
            content: req.file ? req.file.buffer.toString("base64") : req.body.text,
            timestamp: Date.now(),
        };

        // Upload the file to Firebase Storage if present
        if (req.file) {
            const fileName = `stories/${story.id}-${req.file.originalname}`;
            const file = bucket.file(fileName);
            await file.save(req.file.buffer, {
                metadata: {
                    contentType: req.file.mimetype,
                },
            });
            story.fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        }

        stories.push(story);

        // Auto-remove after 24 hours
        setTimeout(() => {
            stories = stories.filter(s => s.id !== story.id);
        }, 24 * 60 * 60 * 1000);

        res.json({ message: "Story added", story });
    } catch (error) {
        console.error("Error uploading story:", error);
        res.status(500).json({ error: "Error uploading story" });
    }
});

// Route to get all stories
app.get("/stories", (req, res) => {
    res.json(stories);
});

// Start the server
app.listen(3000, () => {
    console.log("✅ Server is running on port 3000");
});
