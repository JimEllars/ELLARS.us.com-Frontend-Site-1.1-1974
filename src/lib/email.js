// Scaffolding for EmailIt API integration

export const sendEmail = async (payload) => {
  const host = import.meta.env.VITE_EMAILIT_HOST || 'smtp.emailit.com';
  console.log(`[EmailIt] Staging transmission to ${host} with payload:`, payload);

  // Future implementation will hit the Cloudflare backend here
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, message: 'Email configuration staged successfully.' });
    }, 1000);
  });
};

export const subscribeToNewsletter = async (cleanEmail) => {
  console.log(`[EmailIt] Routing subscription to Cloudflare backend for:`, cleanEmail);

  const payload = {
    email: cleanEmail,
    lead_origin: "ellars_brand_v5.17"
  };

  try {
    const response = await fetch('/api/v1/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[EmailIt] Backend returned error status:", response.status, errorData);
      throw new Error(`Subscription failed with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[EmailIt] Network or parsing error during subscription:", error);
    throw error;
  }
};
