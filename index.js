const express = require('express');
const cors = require('cors');
process.env.YTDL_NO_UPDATE = 'true';
const ytdl = require('ytdl-core');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/download', async (req, res) => {
  const { url } = req.body;
  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).send('Invalid or missing YouTube URL');
  }

  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });

    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
    ytdl.downloadFromInfo(info, { format }).pipe(res);
  } catch (error) {
    console.error('YTDL Error:', error.message);
    res.status(500).send('Error downloading video');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
