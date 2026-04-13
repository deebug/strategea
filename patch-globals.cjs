const fs = require('fs');

const file1 = 'node_modules/solid-start/node/globals.js';
if (fs.existsSync(file1)) {
  let content = fs.readFileSync(file1, 'utf8');
  if (content.includes('crypto: crypto.webcrypto')) {
    content = content.replace('crypto: crypto.webcrypto', '');
    fs.writeFileSync(file1, content);
    console.log('Patched solid-start globals.js to fix crypto getter TypeError');
  }
}

const file2 = 'node_modules/solid-ssr/static/writeToDisk.js';
if (fs.existsSync(file2)) {
  let content = fs.readFileSync(file2, 'utf8');
  if (content.includes('const res = await server({ url: process.argv[4] });')) {
    content = content.replace(
      'const res = await server({ url: process.argv[4] });',
      'let res = await server({ url: process.argv[4] });\n  if (res && res.text) { res = await res.text(); }\n  if (!res) { res = "<html><body>404 Not Found</body></html>"; }'
    );
    fs.writeFileSync(file2, content);
    console.log('Patched solid-ssr writeToDisk.js to fix undefined res TypeError');
  }
}
