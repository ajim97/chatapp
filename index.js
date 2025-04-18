// server.js
const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.post('/api/formats', async (req, res) => {
  const { url } = req.body;
  try {
    const info = await ytdl.getInfo(url);
    const formats = ytdl.filterFormats(info.formats, 'audioandvideo');
    const simplified = formats.map((f) => ({
      quality: f.qualityLabel,
      mimeType: f.mimeType,
      url: f.url,
    }));
    res.json(simplified);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch formats' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
