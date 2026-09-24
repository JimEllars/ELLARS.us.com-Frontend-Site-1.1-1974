const fs = require('fs');
let content = fs.readFileSync('src/components/common/ProtectedRoute.jsx', 'utf8');

content = content.replace(
`  if (!userToken) {
    if (!isOnline && userToken) {
      // Keep dashboard mounted with banner if network is lost while token existed
    } else {
      return <Navigate to="/login" replace />;
    }
  }`,
`  if (!userToken) {
    // If the token is null, but we are offline, and local storage might have had it? No, if userToken is null here, they are truly logged out.
    // The instructions say "if the user is verified in storage but offline, permit access to dashboard screens while showing a non-intrusive offline indicator rather than redirecting."
    // If they were verified in storage, userToken would not be null.
    // But wait, the original code had \`if (!isOnline && userToken)\` inside \`if (!userToken)\`, which is impossible.
    // Let's just navigate to login if there is no userToken.
    return <Navigate to="/login" replace />;
  }
`
);

content = content.replace(
`    // Silent validation polling
    const validateToken = async () => {
       if (!userToken) {
         setIsValidating(false);
         return;
       }

       try {
         if (import.meta.env.DEV) console.log("[ProtectedRoute] Initiating silent token validation...");

         // If offline, trust the local token until network recovers
         if (!isOnline) {
             if (import.meta.env.DEV) console.log("[ProtectedRoute] Offline mode: bypassing session verification, preserving token.");
             setIsValidating(false);
             return;
         }`,
`    // Silent validation polling
    const validateToken = async () => {
       if (!userToken) {
         setIsValidating(false);
         return;
       }

       try {
         if (import.meta.env.DEV) console.log("[ProtectedRoute] Initiating silent token validation...");

         // If offline, trust the local token until network recovers
         if (!isOnline) {
             if (import.meta.env.DEV) console.log("[ProtectedRoute] Offline mode: bypassing session verification, preserving token.");
             setIsValidating(false);
             return;
         }`
);

fs.writeFileSync('src/components/common/ProtectedRoute.jsx', content);
