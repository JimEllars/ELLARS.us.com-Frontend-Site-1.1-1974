const fs = require('fs');

let content = fs.readFileSync('src/components/home/RantsFeed.jsx', 'utf8');

content = content.replace(
  "isFeatured ? 'deco-frame border-yellow-electric shadow-[0_0_15px_rgba(253,224,71,0.2)]' : ''",
  "isFeatured ? 'deco-frame border border-yellow-electric shadow-[0_0_20px_rgba(253,224,71,0.5)]' : ''"
);

fs.writeFileSync('src/components/home/RantsFeed.jsx', content);
