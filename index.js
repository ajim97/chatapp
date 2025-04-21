const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const DOWNLOADS_DIR = path.join(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR);

// Get video info and available formats (filtered)
app.post('/info', (req, res) => {
  const videoUrl = req.body.url;
  if (!videoUrl) return res.status(400).send('URL is required');

  const command = `yt-dlp -F "${videoUrl}"`;

  exec(command, (err, stdout) => {
    if (err) {
      console.error('Format fetch error:', err);
      return res.status(500).send('Failed to get formats');
    }

    // Get title and thumbnail
    const titleCmd = `yt-dlp --print "%(title)s" --print "%(thumbnail)s" "${videoUrl}"`;
    exec(titleCmd, (infoErr, infoOut) => {
      if (infoErr) {
        console.error('Info fetch error:', infoErr);
        return res.status(500).send('Failed to fetch video info');
      }

      const [title, thumbnail] = infoOut.trim().split('\n');

      const formats = stdout.split('\n').filter(line =>
        /\b(360|720|1080)p\b/.test(line) && /video only|avc1|mp4/.test(line)
      ).map(line => {
        const parts = line.trim().split(/\s+/);
        const formatId = parts[0];
        const resolution = parts.find(p => /\d+p/.test(p));
        return { formatId, resolution };
      });

      res.json({ title, thumbnail, formats });
    });
  });
});

// Download video in selected format
app.post('/download', (req, res) => {
  const { url, format } = req.body;
  if (!url || !format) return res.status(400).send('URL and format required');

  const timestamp = Date.now();
  const outputTemplate = path.join(DOWNLOADS_DIR, `video_${timestamp}.%(ext)s`);

  const command = `yt-dlp -f "${format}+bestaudio" -o "${outputTemplate}" "${url}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('Download error:', error);
      console.error('stderr:', stderr);
      return res.status(500).send('Failed to download video');
    }

    const prefix = `video_${timestamp}`;
    const files = fs.readdirSync(DOWNLOADS_DIR);
    const actualFile = files.find(f => f.startsWith(prefix));
    const actualPath = actualFile ? path.join(DOWNLOADS_DIR, actualFile) : null;

    if (!actualPath || !fs.existsSync(actualPath)) {
      return res.status(404).send('File not found');
    }

    res.download(actualPath, actualFile, err => {
      if (err) console.error('Send error:', err);
      fs.unlink(actualPath, () => {});
    });
  });
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
