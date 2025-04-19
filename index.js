const express = require('express');
const cors = require('cors');
const ytdl = require('ytdl-core');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.get('/download', async (req, res) => {
  const videoUrl = req.query.url;
  if (!ytdl.validateURL(videoUrl)) {
    return res.status(400).send('Invalid YouTube URL');
  }

  try {
    const info = await ytdl.getInfo(videoUrl);
    const title = info.videoDetails.title.replace(/[\/\\?%*:|"<>]/g, '-');
    const format = ytdl.chooseFormat(info.formats, { quality: '18' }); // MP4 360p

    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);
    ytdl(videoUrl, { format }).pipe(res);
  } catch (err) {
    console.error('Download error:', err.message);
    res.status(500).send('Download failed');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
