const express = require('express');
const multer  = require('multer');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const { replaceBackground } = require("backrem");

const IMAGE_DIR = './image'
const PORT = 8080;

function fullPath(filename)
{
  return `${IMAGE_DIR}/${filename}`;
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, IMAGE_DIR)
  },
  filename: function (req, file, cb) {
    req.imageId = uuid.v4()
    cb(null, req.imageId + '.jpeg')
  }
})
const upload = multer({ storage: storage })
const app = express();

app.post('/upload', upload.single('image'), (req, res, next) =>  {
  res.status(201);
  res.json({'id': req.imageId});
})

app.get('/list', (req, res) => {
  fs.readdir(IMAGE_DIR, (err, files) => {
    files = files.filter(file => !file.startsWith('.'));

    const filesData = files.map(file => {
      const {size, birthtimeMs} = fs.statSync(fullPath(file));

      return {
        'id': path.parse(fullPath(file)).name,
        'uploadedAt': Math.floor(birthtimeMs),
        size,
      };
    });

    res.json(filesData);
  });
});

// app.get('/', function(req,res) {
//   res.sendFile('/home/kim/yandex-academy/node/src/index.html');
// });

app.get('/image/:id', function (req, res) {
  res.setHeader('content-type', 'image/jpeg');
  res.sendFile(fullPath(req.params.id + '.jpeg'), {'root': __dirname + '/../'}, err => {
    res.status(err.code === 'ENOENT' ? 404 : 500);
    res.send();
  });
});

app.delete('/image/:id', function (req, res) {
  fs.unlink(fullPath(req.params.id + '.jpeg'), (err) => {
    res.status(err.code === 'ENOENT' ? 404 : 500);
    res.send();
  });
  res.status(200);
  res.json({});
});

app.get('/merge', function (req, res) {
  const { front, back, color, threshold } = req.query;
  const frontStream = fs.createReadStream(fullPath(front + '.jpeg'));
  const backStream = fs.createReadStream(fullPath(back + '.jpeg'));

  for (stream of [frontStream, backStream]) {
    stream.on('error', (error) => {
      res.status(error.code === 'ENOENT' ? 404 : 500);
      res.send();
    });
  }

  replaceBackground(frontStream, backStream, color.split(','), threshold).then(
    (readableStream) => {
      res.setHeader('content-type', 'image/jpeg');
      readableStream.pipe(res);
    }, error => {
        res.status(400);
        res.send(error.message);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
