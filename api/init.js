export default async function handler(req, res) {
  // THE V2 ENDPOINT: Fetches both Config and Prices in one shot
  const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxEsNMFfHhTJT46AG2lgdS83u48eQiCKrxYjWLSsrU2ri7uUhRkbei_9D26J9W05UkdFQ/exec?api=init_v2";

  try {
    const response = await fetch(GAS_API_URL);
    const data = await response.json();

    if (data.success) {
      // THE MAGIC FORMULA:
      // s-maxage=60: The cache is perfectly "fresh" for 1 minute.
      // stale-while-revalidate=86400: For the next 24 hours, give the user the cached data INSTANTLY (30ms).
      // Then, Vercel silently fetches fresh data from GAS in the background to update the cache for the next user.
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=86400');
      return res.status(200).json(data);
    } else {
      return res.status(500).json({ success: false, error: 'Google returned an error' });
    }
  } catch (error) {
    console.error("Vercel Edge Fetch Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}