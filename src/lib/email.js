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

  const url = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/subscribe` : '/api/v1/subscribe';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email: cleanEmail, source: "Ellars_Web_App" })
    });

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error("Transmission rejected: Invalid format");
      } else if (response.status === 500) {
        throw new Error("Core server offline");
      } else {
        throw new Error(`Subscription failed with status: ${response.status}`);
      }
    }

    return await response.json();
  } catch (error) {
    console.error("[EmailIt] Network or parsing error during subscription:", error);
    throw error;
  }
};

export const submitBookingInquiry = async (payload) => {
  console.log(`[EmailIt] Routing booking inquiry to Cloudflare backend:`, payload);

  const url = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/subscribe` : '/api/v1/subscribe';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      if (response.status === 400) {
        throw new Error("Transmission rejected: Invalid format");
      } else if (response.status === 500) {
        throw new Error("Core server offline");
      } else {
        throw new Error(`Booking inquiry failed with status: ${response.status}`);
      }
    }

    return await response.json();
  } catch (error) {
    console.error("[EmailIt] Network or parsing error during booking inquiry:", error);
    throw error;
  }
};
