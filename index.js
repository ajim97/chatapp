const express = require("express");
const multer = require("multer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

let stories = [];

// Upload a new story (Image, Video, or Text)
app.post("/stories", upload.single("file"), (req, res) => {
    const story = {
        id: Date.now(),
        type: req.file ? (req.file.mimetype.startsWith("image") ? "image" : "video") : "text",
        content: req.file ? req.file.buffer.toString("base64") : req.body.text,
        timestamp: Date.now(),
    };
    stories.push(story);

    // Auto-remove after 24 hours
    setTimeout(() => {
        stories = stories.filter(s => s.id !== story.id);
    }, 24 * 60 * 60 * 1000);

    res.json({ message: "Story added", story });
});

// Get all stories
app.get("/stories", (req, res) => {
    res.json(stories);  
});

app.listen(3000, () => console.log("Server running on port 3000"));
