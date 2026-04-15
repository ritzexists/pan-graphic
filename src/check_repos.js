import https from 'https';

https.get('https://api.github.com/users/Collletttivo/repos?per_page=100', {
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const repos = JSON.parse(data);
    if (Array.isArray(repos)) {
      console.log(repos.map(r => r.name).filter(n => n !== 'Collletttivo.github.io' && n !== 'collletttivo-website').join(', '));
    } else {
      console.log(repos);
    }
  });
}).on('error', console.error);
