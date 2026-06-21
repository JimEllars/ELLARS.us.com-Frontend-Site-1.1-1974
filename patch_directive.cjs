const fs = require('fs');
let content = fs.readFileSync('src/pages/DirectiveDetail.jsx', 'utf8');

const regex = /<p className="text-text-muted mb-8 text-sm font-light">\s*The requested directive could not be located in our intelligence index\.\s*<\/p>/m;

const replacement = `<p className="diagnostic-text mb-8 flex flex-wrap justify-center items-center gap-1">
            <span className="shrink-0">The requested directive could not be located in our intelligence index.</span>
            <span className="diagnostic-param">[{directiveSlug}]</span>
          </p>`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/pages/DirectiveDetail.jsx', content);
