const fs = require('fs');
const path = 'src/components/home/Newsletter.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace('const sanitizedEmail = DOMPurify.sanitize(email).trim();', 'const sanitizedEmail = DOMPurify.sanitize(email).trim().toLowerCase();');

const payloadStr = `
    const payload = {
      email: sanitizedEmail,
      lead_origin: "frontend_brand_hub_v5.10"
    };
    console.log("Telemetry Payload:", payload);
`;

content = content.replace('setIsSubmitting(true);\n    setHasError(false);\n\n    // Simulate API call with potential error simulation or just success', 'setIsSubmitting(true);\n    setHasError(false);\n\n' + payloadStr + '\n    // Simulate API call with potential error simulation or just success');

fs.writeFileSync(path, content);
