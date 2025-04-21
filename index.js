const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const ytdlp = require('yt-dlp-exec');

const app = express();
app.use(cors());
app.use(express.json());

const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR);

// Get video info and formats 
app.post('/info', async (req, res) => {
  const videoUrl = req.body.url;
  if (!videoUrl) return res.status(400).send('URL is required');

  try {
    const info = await ytdlp(videoUrl, {
      dumpSingleJson: true,
      noWarnings: true,
    });

    const { title, thumbnail, formats } = info;

    const filteredFormats = formats
      .filter(f =>
        f.format_id &&
        f.ext === 'mp4' &&
        f.height &&
        [360, 720, 1080].includes(f.height)
      )
      .map(f => ({
        formatId: f.format_id,
        resolution: `${f.height}p`
      }));

    res.json({ title, thumbnail, formats: filteredFormats });
  } catch (err) {
    console.error('Error fetching info:', err);
    res.status(500).send('Failed to get video info');
  }
});

// Download video in selected format
app.post('/download', async (req, res) => {
  const { url, format } = req.body;
  if (!url || !format) return res.status(400).send('URL and format required');

  const timestamp = Date.now();
  const outputTemplate = path.join(DOWNLOADS_DIR, `video_${timestamp}.%(ext)s`);

  try {
    await ytdlp(url, {
      format: `${format}+bestaudio`,
      output: outputTemplate,
      mergeOutputFormat: 'mp4'
    });

    const files = fs.readdirSync(DOWNLOADS_DIR);
    const actualFile = files.find(f => f.startsWith(`video_${timestamp}`));
    const actualPath = path.join(DOWNLOADS_DIR, actualFile);

    res.download(actualPath, actualFile, err => {
      if (err) console.error('Send error:', err);
      fs.unlink(actualPath, () => {}); // delete after download
    });
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).send('Failed to download video');
  }
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
