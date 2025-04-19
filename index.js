const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// 📥 Get video info and direct download URL
app.get('/video', async (req, res) => {
  const videoUrl = req.query.url;

  if (!ytdl.validateURL(videoUrl)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const info = await ytdl.getInfo(videoUrl);
    const format = ytdl.chooseFormat(info.formats, {
      quality: '18', // 360p
      filter: 'videoandaudio',
    });

    res.json({
      title: info.videoDetails.title,
      thumbnail: info.videoDetails.thumbnails.pop().url,
      downloadUrl: format.url,
    });
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve video info' });
  }
});

app.listen(PORT, () => {
  console.log(`YouTube downloader backend running on port ${PORT}`);
});
