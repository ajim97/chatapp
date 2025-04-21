const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR);

// 🎯 Fetch Video Info (title, thumbnail, format options)
app.post('/info', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send('URL required');

  const command = `yt-dlp -F "${url}"`;
  exec(command, (err, stdout) => {
    if (err) {
      console.error('Info fetch error:', err);
      return res.status(500).send('Failed to fetch info');
    }

    const formats = [];
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.includes('mp4') && /(360|720|1080)p/.test(line)) {
        const parts = line.trim().split(/\s+/);
        formats.push({
          formatId: parts[0],
          resolution: parts[2],
        });
      }
    }

    // Get title and thumbnail
    exec(`yt-dlp --print "%(title)s\n%(thumbnail)s" "${url}"`, (err, out) => {
      if (err) {
        console.error('Metadata error:', err);
        return res.status(500).send('Failed to get metadata');
      }

      const [title, thumbnail] = out.trim().split('\n');
      res.json({ title, thumbnail, formats });
    });
  });
});

// 🎯 Download Selected Format
app.post('/download', (req, res) => {
  const { url, format } = req.body;
  if (!url || !format) return res.status(400).send('URL and format required');

  const filename = `video_${Date.now()}.mp4`;
  const outputPath = path.join(DOWNLOADS_DIR, filename);

  const command = `yt-dlp -f "${format}+bestaudio" --merge-output-format mp4 -o "${outputPath}" "${url}"`;

  exec(command, (error) => {
    if (error) {
      console.error('Download error:', error);
      return res.status(500).send('Failed to download video');
    }

    res.download(outputPath, filename, (err) => {
      if (err) {
        console.error('Send error:', err);
      }
      fs.unlink(outputPath, () => {});
    });
  });
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
