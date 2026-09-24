const fs = require('fs');
let content = fs.readFileSync('src/store/useAppStore.js', 'utf8');

// Synchronously initialize _hasHydrated if local storage exists
// we can do this by setting the initial state of _hasHydrated
content = content.replace(
`      _hasHydrated: false,
      isHydrating: true,`,
`      _hasHydrated: typeof window !== 'undefined' ? (safeLocalStorage.getItem('ellars_us_com_preferences') !== null) : false,
      isHydrating: typeof window !== 'undefined' ? (safeLocalStorage.getItem('ellars_us_com_preferences') === null) : true,`
);
fs.writeFileSync('src/store/useAppStore.js', content);
