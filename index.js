const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const ytdlp = require('yt-dlp-exec').raw;

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Set the local yt-dlp binary path
const ytDlpPath = path.join(__dirname, 'bin', 'yt-dlp');

app.post('/info', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const result = await ytdlp(url, {
      dumpSingleJson: true,
      noWarnings: true,
      binary: ytDlpPath,
    });

    const json = JSON.parse(result.stdout);
    const formats = json.formats.map((f, index) => ({
      formatId: f.format_id,
      resolution: f.format_note || f.resolution || f.ext,
      ext: f.ext,
    }));

    res.json({
      title: json.title,
      thumbnail: json.thumbnail,
      formats: formats.filter(f => f.formatId && f.resolution),
    });
  } catch (err) {
    console.error('Error fetching info:', err);
    res.status(500).json({ error: 'Failed to fetch video info' });
  }
});

app.post('/download', async (req, res) => {
  const { url, format } = req.body;
  if (!url || !format) return res.status(400).json({ error: 'URL and format are required' });

  const tempOutput = path.join(__dirname, `video_${Date.now()}.mp4`);

  const command = `"${ytDlpPath}" -f ${format} -o "${tempOutput}" "${url}"`;

  exec(command, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Download error: ${error.message}`);
      return res.status(500).json({ error: 'Download failed' });
    }

    // Send file as base64
    try {
      const fileBuffer = fs.readFileSync(tempOutput);
      const base64Data = fileBuffer.toString('base64');

      // Delete the temp file
      fs.unlinkSync(tempOutput);

      res.send(base64Data);
    } catch (err) {
      console.error('Error reading file:', err);
      res.status(500).json({ error: 'Failed to send file' });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
