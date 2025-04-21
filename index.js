const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
const YTDLP_PATH = path.join(__dirname, 'bin', 'yt-dlp'); // Make sure the yt-dlp binary exists here

// Create downloads directory if it doesn't exist
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR);

// 🎯 GET VIDEO INFO (title, thumbnail, available formats)
app.post('/info', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send('URL is required');

  const command = `"${YTDLP_PATH}" -j "${url}"`;
  exec(command, (error, stdout) => {
    if (error) {
      console.error('Info fetch error:', error);
      return res.status(500).send('Failed to fetch video info');
    }

    try {
      const data = JSON.parse(stdout);
      const filteredFormats = data.formats
        .filter(f => ['360', '720', '1080'].some(q => f.format_note?.includes(q)))
        .map(f => ({
          format_id: f.format_id,
          resolution: f.format_note || f.format,
          ext: f.ext,
        }));

      res.json({
        title: data.title,
        thumbnail: data.thumbnail,
        formats: filteredFormats,
      });
    } catch (e) {
      console.error('Parsing error:', e);
      res.status(500).send('Failed to parse video info');
    }
  });
});

// 🎯 DOWNLOAD SELECTED FORMAT
app.post('/download', (req, res) => {
  const { url, format_id } = req.body;
  if (!url || !format_id) return res.status(400).send('URL and format_id are required');

  const filename = `video_${Date.now()}.mp4`;
  const outputPath = path.join(DOWNLOADS_DIR, filename);

  const command = `"${YTDLP_PATH}" -f ${format_id}+bestaudio --merge-output-format mp4 -o "${outputPath}" "${url}"`;

  exec(command, (error) => {
    if (error) {
      console.error('Download error:', error);
      return res.status(500).send('Failed to download video');
    }

    // Serve file for download
    res.download(outputPath, filename, (err) => {
      if (err) {
        console.error('Send error:', err);
      }
      fs.unlink(outputPath, () => {}); // Clean up file after sending
    });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
