// api/data.js
// Supabase integration for persistent storage

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('⚠️ Supabase not configured. Set SUPABASE_URL and SUPABASE_KEY in Vercel environment variables.');
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ===== GET: Return data =====
  if (req.method === 'GET') {
    try {
      // Get query parameters
      const { limit = 1, timeframe } = req.query;
      
      // Build query
      let query = `
        SELECT * FROM coinglass_data 
        ${timeframe ? `WHERE timeframe = '${timeframe}'` : ''}
        ORDER BY timestamp DESC 
        LIMIT ${Math.min(parseInt(limit), 100)}
      `;

      const response = await fetch(``${SUPABASE_URL}/rest/v1/coinglass_data?select=*&order=timestamp.desc&limit=${limit}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Supabase GET error:', error);
        return res.status(500).json({ error: 'Failed to fetch data' });
      }

      const data = await response.json();

      return res.status(200).json({
        status: 'success',
        count: data.length,
        data: data,
        query: { limit: parseInt(limit), timeframe: timeframe || 'all' }
      });

    } catch (error) {
      console.error('GET handler error:', error);
      return res.status(500).json({ 
        error: 'Server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  }

  // ===== POST: Store data from extension =====
  if (req.method === 'POST') {
    try {
      const body = req.body;
      
      // Validate required fields
      if (!body?.longPercent || !body?.shortPercent) {
        return res.status(400).json({ 
          error: 'Invalid payload',
          required: ['longPercent', 'shortPercent'] 
        });
      }

      // Prepare data for Supabase
      const payload = {
        long_percent: body.longPercent,
        short_percent: body.shortPercent,
        long_volume: body.longVolume || null,
        short_volume: body.shortVolume || null,
        timeframe: body.timeframe || '4 hour',
        timestamp: body.timestamp || new Date().toISOString(),
        url: body.url || 'https://www.coinglass.com/LongShortRatio'
      };

      // Insert into Supabase
      const response = await fetch(`${SUPABASE_URL}/rest/v1/coinglass_data`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Supabase POST error:', error);
        return res.status(500).json({ error: 'Failed to store data' });
      }

      const result = await response.json();
      
      console.log('✅ [COINGLASS_DATA]', payload);
      
      return res.status(200).json({
        success: true,
        inserted: result[0],
        message: 'Data stored in Supabase'
      });

    } catch (error) {
      console.error('❌ [API_ERROR]', error);
      return res.status(500).json({ 
        error: 'Processing failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  return res.status(405).json({ 
    error: 'Method not allowed', 
    allowed: ['GET', 'POST', 'OPTIONS'] 
  });
}
