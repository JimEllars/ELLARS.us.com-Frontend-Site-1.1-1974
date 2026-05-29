const fs = require('fs');
const path = 'src/index.css';
let content = fs.readFileSync(path, 'utf8');

const bracketsCss = `
  .deco-brackets::before,
  .deco-brackets::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    border: 2px solid #fde047;
    opacity: 0;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }
  .deco-brackets::before {
    top: -2px;
    left: -2px;
    border-right: none;
    border-bottom: none;
    transform: translate(-5px, -5px);
  }
  .deco-brackets::after {
    bottom: -2px;
    right: -2px;
    border-left: none;
    border-top: none;
    transform: translate(5px, 5px);
  }
  .deco-brackets:hover::before,
  .deco-brackets:hover::after {
    opacity: 1;
    transform: translate(0, 0);
  }
`;

content = content.replace('.btn-gold:hover {', bracketsCss + '\n  .btn-gold:hover {');
fs.writeFileSync(path, content);
