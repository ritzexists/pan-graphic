import https from 'https';

const urls = [
  'https://cdn.jsdelivr.net/gh/Collletttivo/Karrik@master/Fonts/Webfonts/Karrik-Regular.woff2',
  'https://cdn.jsdelivr.net/gh/Collletttivo/Ribes@master/Fonts/Webfonts/Ribes-Black.woff2',
  'https://cdn.jsdelivr.net/gh/Collletttivo/Karrik@master/fonts/webfonts/Karrik-Regular.woff2',
  'https://cdn.jsdelivr.net/gh/Collletttivo/Ribes@master/fonts/webfonts/Ribes-Black.woff2'
];

urls.forEach(url => {
  https.get(url, (res) => {
    console.log(`${url}: ${res.statusCode}`);
  }).on('error', (e) => {
    console.error(e);
  });
});
