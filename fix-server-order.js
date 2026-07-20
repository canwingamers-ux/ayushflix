const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const catchAll = `app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});`;

if (code.includes(catchAll)) {
  code = code.replace(catchAll, '');
  code = code.replace(/app\.listen\(/, catchAll + '\n\napp.listen(');
  fs.writeFileSync('server.js', code);
  console.log('Fixed route order');
}
