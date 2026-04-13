const fs = require('fs');
const file = 'node_modules/solid-start/node/globals.js';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('crypto: crypto.webcrypto')) {
    content = content.replace('crypto: crypto.webcrypto', '');
    fs.writeFileSync(file, content);
    console.log('Patched solid-start globals.js to fix crypto getter TypeError');
  }
}
