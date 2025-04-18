const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();

app.use(cors());

app.get('/formats', async (req, res) => {
  const url = req.query.url;
  if (!ytdl.validateURL(url)) return res.status(400).send('Invalid URL');

  try {
    const info = await ytdl.getInfo(url);
    const formats = info.formats
      .filter(f => f.mimeType.includes('video'))
      .map(f => ({
        itag: f.itag,
        quality: f.qualityLabel,
        type: f.mimeType
      }));
    res.json(formats);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/download', (req, res) => {
  const { url, itag } = req.query;
  if (!ytdl.validateURL(url)) return res.status(400).send('Invalid URL');
  res.header('Content-Disposition', 'attachment; filename="video.mp4"');
  ytdl(url, { quality: itag }).pipe(res);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
