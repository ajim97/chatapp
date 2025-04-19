// server.js
const express = require('express');
const ytdl = require('ytdl-core');
const cors = require('cors');
const app = express();

app.use(cors());

app.get('/download', async (req, res) => {
  const videoUrl = req.query.url;
  if (!ytdl.validateURL(videoUrl)) return res.status(400).send('Invalid URL');

  const info = await ytdl.getInfo(videoUrl);
  const format = ytdl.chooseFormat(info.formats, { quality: '18' }); // 18 = 360p MP4

  res.header('Content-Disposition', `attachment; filename="${info.videoDetails.title}.mp4"`);
  ytdl(videoUrl, { format }).pipe(res);
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
