const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

if (!content.includes('const Ecosystem = React.lazy(() => import(\'./pages/Ecosystem\'));')) {
    content = content.replace(
        "import NotFound from './pages/NotFound';",
        "import NotFound from './pages/NotFound';\nconst Ecosystem = React.lazy(() => import('./pages/Ecosystem'));"
    );
}

if (!content.includes('<Route path="/ecosystem" element={<Ecosystem />} />')) {
    content = content.replace(
        '<Route path="/platform" element={<Platform />} />',
        '<Route path="/platform" element={<Platform />} />\n          <Route path="/ecosystem" element={<Ecosystem />} />'
    );
}

fs.writeFileSync('src/App.jsx', content, 'utf8');
