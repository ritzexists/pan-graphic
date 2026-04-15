import https from 'https';

https.get(`https://api.github.com/repos/Collletttivo/karrik/git/trees/main?recursive=1`, {
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const tree = JSON.parse(data).tree;
    if (tree) {
      const woff2Files = tree.filter(t => t.path.endsWith('.woff2')).map(t => t.path);
      console.log(woff2Files.join('\n'));
    } else {
      console.log(JSON.parse(data));
    }
  });
}).on('error', console.error);
