const express = require('express');
const ytdl = require('ytdl-core');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());

app.get('/', (req, res) => {
  res.send('YouTube Downloader Backend is running');
});

// Get available formats
app.get('/formats', async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const info = await ytdl.getInfo(videoUrl);
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio')
      .filter(f => f.container === 'mp4' && f.hasAudio && f.hasVideo && f.qualityLabel)
      .map(f => ({
        quality: f.qualityLabel,
        itag: f.itag,
        contentLength: f.contentLength
      }));

    res.json(formats);
  } catch (error) {
    console.error('Format error:', error);
    res.status(500).json({ error: 'Failed to retrieve formats' });
  }
});

// Stream video download by itag
app.get('/download', async (req, res) => {
  const { url, itag } = req.query;

  if (!url || !itag || !ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    const format = ytdl.chooseFormat(info.formats, { quality: itag });

    if (!format) {
      return res.status(400).json({ error: 'Invalid format selected' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');

    ytdl(url, { format }).pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download video' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
