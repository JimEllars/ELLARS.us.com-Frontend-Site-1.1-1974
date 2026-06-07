const fs = require('fs');

let content = fs.readFileSync('src/pages/NewsMedia.jsx', 'utf8');

// Ensure proper priority for Daily News
// Looks like it already has sort logic, let's make sure it handles "Daily News" in title or category label correctly.
// Also add the requested `.deco-frame border-yellow-electric glow` classes to featured card.
content = content.replace(
  "isFeatured ? 'deco-frame border-yellow-electric shadow-[0_0_15px_rgba(253,224,71,0.2)]' : ''",
  "isFeatured ? 'deco-frame border border-yellow-electric shadow-[0_0_20px_rgba(253,224,71,0.5)]' : ''"
);

fs.writeFileSync('src/pages/NewsMedia.jsx', content);
