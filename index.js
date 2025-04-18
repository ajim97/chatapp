// ===================
// Backend: server.js
// ===================

const express = require("express");
const cors = require("cors");
const ytdl = require("ytdl-core");

const app = express();
app.use(cors());

app.get("/formats", async (req, res) => {
  const videoURL = req.query.url;
  if (!ytdl.validateURL(videoURL)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  const info = await ytdl.getInfo(videoURL);
  const formats = ytdl.filterFormats(info.formats, 'videoandaudio');

  const filtered = formats
    .filter(f => f.container === 'mp4' && f.qualityLabel)
    .map(f => ({
      quality: f.qualityLabel,
      itag: f.itag
    }));

  res.json(filtered);
});

app.get("/download", async (req, res) => {
  const { url, itag } = req.query;
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title.replace(/[\W_]+/g, "_");
  res.header("Content-Disposition", `attachment; filename="${title}.mp4"`);
  ytdl(url, { quality: itag }).pipe(res);
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));

