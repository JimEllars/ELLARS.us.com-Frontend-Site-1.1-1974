export const submitVolunteerForm = async (formData) => {
  console.log(`[VolunteerAPI] Routing volunteer lead to backend with payload:`, formData);

  const url = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/volunteer` : '/api/v1/volunteer';

  const payload = {
    ...formData,
    source: "ellars_volunteer_v1",
    type: "volunteer_lead"
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Mock successful response for now as we don't have the real endpoint in this repo
    // In production, uncomment the fetch call and remove the mock.
    // const response = await fetch(url, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Accept': 'application/json'
    //   },
    //   body: JSON.stringify(payload),
    //   signal: controller.signal
    // });

    // clearTimeout(timeoutId);

    // if (!response.ok) {
    //   if (response.status === 400) {
    //     throw new Error("Transmission rejected: Invalid data format");
    //   } else if (response.status === 500) {
    //     throw new Error("Core server offline");
    //   } else {
    //     throw new Error(`Submission failed with status: ${response.status}`);
    //   }
    // }

    // return await response.json();

    return new Promise((resolve) => {
      setTimeout(() => {
        clearTimeout(timeoutId);
        resolve({ success: true, message: 'Volunteer lead recorded.' });
      }, 1500);
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("[VolunteerAPI] Network timeout: The transmission took too long.");
      throw new Error("Transmission timeout: Network unstable.");
    }
    console.error("[VolunteerAPI] Network or parsing error during submission:", error);
    throw error;
  }
};
