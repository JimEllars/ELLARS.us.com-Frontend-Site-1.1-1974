const WP_API_URL = import.meta.env.VITE_WP_API_URL || 'https://wp.ellars.us.com/wp-json/wp/v2';

// Fallback data for development and reliability
const FALLBACK_POSTS = [
  {
    id: 101,
    slug: 'siphon-economy',
    title: { rendered: "The Siphon Economy Is Bleeding Us Dry" },
    excerpt: { rendered: "How mega-corporations exploit regional geography and labor pools without reinvesting in the communities that sustain them." },
    content: { rendered: "<p>The mathematical framework required to stop the extraction of local wealth...</p>" },
    date: '2025-09-15T10:00:00',
    acf: { episode_number: "045", read_time: "12 Min Read", category_label: "Dispatch" },
    _embedded: { 'wp:featuredmedia': [{ source_url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=800' }] }
  },
  {
    id: 102,
    slug: 'california-floor',
    title: { rendered: "Post-Labor Economics: The California Floor" },
    excerpt: { rendered: "As AI and automation accelerate, traditional wage models will fail. We must replace bloated welfare with algorithmic stability." },
    content: { rendered: "<p>A modernized Negative Income Tax for national infrastructure...</p>" },
    date: '2025-09-12T14:30:00',
    acf: { episode_number: "044", read_time: "18 Min Read", category_label: "Technical Briefing" },
    _embedded: { 'wp:featuredmedia': [{ source_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800' }] }
  },
  {
    id: 103,
    slug: 'politicians-future',
    title: { rendered: "Why Politicians Cannot Build The Future" },
    excerpt: { rendered: "The era of the career orator is over. The logistical challenges of the 2030s require leaders who have actually scaled systems." },
    content: { rendered: "<p>Scaling private sector rigor to community leadership...</p>" },
    date: '2025-09-10T09:15:00',
    acf: { episode_number: "043", read_time: "9 Min Read", category_label: "Dispatch" },
    _embedded: { 'wp:featuredmedia': [{ source_url: 'https://images.unsplash.com/photo-1507537297725-24a1c029d3ca?q=80&w=800' }] }
  }
];

const POSTS_CACHE = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 1000 * 60 * 5 // 5 minutes
};

export async function getLatestPosts(limit = 10, categoryId = null) {
  const cacheKey = `${limit}-${categoryId}`;

  if (!POSTS_CACHE[cacheKey]) {
    POSTS_CACHE[cacheKey] = { data: null, timestamp: null };
  }

  const now = Date.now();
  if (POSTS_CACHE[cacheKey].data && POSTS_CACHE[cacheKey].timestamp && (now - POSTS_CACHE[cacheKey].timestamp < POSTS_CACHE.CACHE_DURATION)) {
    return POSTS_CACHE[cacheKey].data;
  }

  try {
    let url = `${WP_API_URL}/posts?per_page=${limit}&_embed`;
    if (categoryId) url += `&categories=${categoryId}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('WP API Offline');

    const data = await res.json();
    POSTS_CACHE[cacheKey].data = data;
    POSTS_CACHE[cacheKey].timestamp = now;
    return data;
  } catch (error) {
    console.warn("API Error, utilizing fallback protocol:", error.message);
    return FALLBACK_POSTS.slice(0, limit);
  }
}

export async function getPostBySlug(slug) {
  try {
    const res = await fetch(`${WP_API_URL}/posts?slug=${slug}&_embed`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    return data[0] || FALLBACK_POSTS.find(p => p.slug === slug);
  } catch (error) {
    return FALLBACK_POSTS.find(p => p.slug === slug);
  }
}

export function stripHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}