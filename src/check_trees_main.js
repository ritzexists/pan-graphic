import https from 'https';

const repos = ['absans', 'aujournuit', 'borges', 'coconat', 'halibut', 'mattone', 'mazius-display', 'messapia', 'necto-mono', 'ortica', 'ribes', 'ronzino', 'sinistre', 'sneaky-times', 'sprat'];

repos.forEach(repo => {
  https.get(`https://api.github.com/repos/Collletttivo/${repo}/git/trees/main?recursive=1`, {
    headers: { 'User-Agent': 'Node.js' }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const tree = JSON.parse(data).tree;
      if (tree) {
        const woff2Files = tree.filter(t => t.path.endsWith('.woff2')).map(t => t.path);
        if (woff2Files.length > 0) {
          console.log(`\n--- ${repo} ---`);
          console.log(woff2Files.slice(0, 3).join('\n'));
        }
      }
    });
  }).on('error', console.error);
});
