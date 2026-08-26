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

export const subscribeToNewsletter = async (payload) => {
  let rawEmail = typeof payload === "string" ? payload : payload.email;
  const cleanEmail = String(rawEmail).replace(/<\/?script.*?>/gi, "").replace(/[<>&"']/g, function(m) { return "&#" + m.charCodeAt(0) + ";"; }).trim().toLowerCase();
  console.log(`[EmailIt] Routing subscription to Cloudflare backend for:`, cleanEmail);

  const url = import.meta.env.VITE_CF_FORM_ENDPOINT;
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return { isError: true, message: "Missing Cloudflare form endpoint configuration: VITE_CF_FORM_ENDPOINT is not set or invalid." };
  }

  const metadata = {
    form_version: "v5.40-core",
    source_url: typeof window !== "undefined" ? window.location.href : "",
    signup_timestamp: new Date().toISOString()
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: cleanEmail,
        source: "Ellars_Web_App",
        footprint: "v5.40-core",
        ...metadata
      })
    });

    if (!response.ok) {
      if (response.status === 400) {
        return { isError: true, message: "Transmission rejected: Invalid format" };
      } else if (response.status === 500) {
        return { isError: true, message: "Core server offline" };
      } else {
        return { isError: true, message: `Subscription failed with status: ${response.status}` };
      }
    }

    return await response.json();
  } catch (error) {
    console.error("[EmailIt] Network or parsing error during subscription:", error);
    return { isError: true, message: error.message || 'An unknown network error occurred.' };
  }
};

export const submitBookingInquiry = async (payload) => {
  console.log(`[EmailIt] Routing booking inquiry to Cloudflare backend:`, payload);

  const url = import.meta.env.VITE_CF_FORM_ENDPOINT;
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return { isError: true, message: "Missing Cloudflare form endpoint configuration: VITE_CF_FORM_ENDPOINT is not set or invalid." };
  }

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
        return { isError: true, message: "Transmission rejected: Invalid format" };
      } else if (response.status === 500) {
        return { isError: true, message: "Core server offline" };
      } else {
        return { isError: true, message: `Booking inquiry failed with status: ${response.status}` };
      }
    }

    return await response.json();
  } catch (error) {
    console.error("[EmailIt] Network or parsing error during booking inquiry:", error);
    return { isError: true, message: error.message || 'An unknown network error occurred.' };
  }
};
