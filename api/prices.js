export default async function handler(req, res) {
  // Your exact GAS API URL
  const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxEsNMFfHhTJT46AG2lgdS83u48eQiCKrxYjWLSsrU2ri7uUhRkbei_9D26J9W05UkdFQ/exec?api=prices";

  try {
    const response = await fetch(GAS_API_URL);
    const data = await response.json();

    if (data.success) {
      // THE MAGIC TRICK: Tell Vercel's Global CDN to cache this exact JSON for 24 hours (86400 seconds)
      // "stale-while-revalidate" means if someone visits exactly at 24 hours and 1 minute, 
      // Vercel gives them the old fast cache instantly, while quietly updating the cache in the background for the next person!
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
      return res.status(200).json(data);
    } else {
      return res.status(500).json({ success: false, error: 'Google returned an error' });
    }
  } catch (error) {
    console.error("Vercel Edge Fetch Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}