// api/data.js - ADD VALIDATION

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url, `https://${req.headers.host}`);
      const limit = Math.min(parseInt(url.searchParams.get('limit')) || 1, 100);

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/coinglass_data?select=*&order=timestamp.desc.nullslast&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to fetch data' });
      }

      const data = await response.json();

      if (data.length === 0) {
        return res.status(404).json({
          status: 'empty',
          message: 'No data yet. Use extension on Coinglass page to send data.'
        });
      }

      return res.status(200).json({ status: 'success', count: data.length, data });
    }

    if (req.method === 'POST') {
      const body = req.body;
      
      // VALIDATE REQUIRED FIELDS (snake_case)
      if (!body?.long_percent || !body?.short_percent) {
        console.error('Missing required fields:', Object.keys(body));
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['long_percent', 'short_percent'],
          received: body ? Object.keys(body) : 'no data'
        });
      }

      const payload = {
        long_percent: body.long_percent,
        short_percent: body.short_percent,
        long_volume: body.long_volume || null,
        short_volume: body.short_volume || null,
        timeframe: body.timeframe || '4 hour',
        timestamp: body.timestamp || new Date().toISOString(),
        url: body.url || 'https://www.coinglass.com/LongShortRatio'
      };

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
        return res.status(500).json({ error: 'Failed to store data', details: error });
      }

      const result = await response.json();
      
      console.log('✅ [COINGLASS_DATA]', payload);
      
      return res.status(200).json({
        success: true,
        inserted: result[0] || payload,
        message: 'Data stored in Supabase'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Handler error:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}
