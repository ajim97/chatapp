const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/download', async (req, res) => {
  const { url } = req.body;

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).send('Invalid YouTube URL');
  }

  try {
    res.setHeader('Content-Disposition', 'attachment; filename=video.mp4');
    ytdl(url, { format: 'mp4' }).pipe(res);
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).send('Failed to download video');
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server is running...');
});
