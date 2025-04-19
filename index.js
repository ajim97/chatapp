const express = require('express');
const ytdl = require('ytdl-core');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/download', async (req, res) => {
  const { url } = req.body;

  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, '_'); // sanitize title

    res.header('Content-Disposition', `attachment; filename="${title}.mp4"`);

    ytdl(url, {
      quality: 'highestvideo',
      filter: format => format.container === 'mp4',
    }).pipe(res);
  } catch (err) {
    res.status(500).json({ error: 'Failed to download video' });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
