const express = require('express');
const ytdl = require('ytdl-core');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // Allow cross-origin requests from React Native app

// Endpoint: Get video metadata
app.post('/video-info', async (req, res) => {
  const { url } = req.body;

  // Validate input
  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid or missing YouTube URL' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const formats = info.formats
      .filter((format) => format.hasVideo && format.hasAudio) // Only include formats with both video and audio
      .map((format) => ({
        itag: format.itag,
        qualityLabel: format.qualityLabel || format.quality,
        mimeType: format.mimeType,
      }));

    res.json({
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails[0].url,
      formats,
    });
  } catch (error) {
    console.error('Error fetching video info:', error);
    res.status(500).json({ error: 'Failed to fetch video info' });
  }
});

// Endpoint: Get download URL
app.post('/download', async (req, res) => {
  const { url, itag } = req.body;

  // Validate input
  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid or missing YouTube URL' });
  }
  if (!itag) {
    return res.status(400).json({ error: 'Missing format itag' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const format = info.formats.find((f) => f.itag === parseInt(itag));
    if (!format) {
      return res.status(400).json({ error: 'Invalid format itag' });
    }

    // Return the direct download URL for the format
    res.json({ downloadUrl: format.url });
  } catch (error) {
    console.error('Error processing download:', error);
    res.status(500).json({ error: 'Failed to process download' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});