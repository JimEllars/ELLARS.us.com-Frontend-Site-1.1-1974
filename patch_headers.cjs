const fs = require('fs');
let content = fs.readFileSync('public/_headers', 'utf8');

// /sw.js currently has: Cache-Control: public, max-age=0, no-cache, no-store, must-revalidate
// The instructions say: "Verify that sw.js and manifest.json have Cache-Control: public, max-age=0, must-revalidate."
content = content.replace(
`/sw.js
  Cache-Control: public, max-age=0, no-cache, no-store, must-revalidate`,
`/sw.js
  Cache-Control: public, max-age=0, must-revalidate`
);

fs.writeFileSync('public/_headers', content);
