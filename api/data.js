// api/data.js
// CORRECT Supabase REST API syntax

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check if Supabase is configured
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Supabase not configured');
    return res.status(500).json({
      error: 'Supabase not configured',
      message: 'Add SUPABASE_URL and SUPABASE_KEY in Vercel environment variables'
    });
  }

  try {
    // ===== GET: Return latest data =====
    if (req.method === 'GET') {
      // Parse limit from query string
      const url = new URL(req.url, `https://${req.headers.host}`);
      const limit = Math.min(parseInt(url.searchParams.get('limit')) || 1, 100);

      // CORRECT Supabase REST API syntax
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
        
        // Table doesn't exist
        if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
          return res.status(404).json({
            error: 'Table not found',
            message: 'Run SQL script to create "coinglass_data" table in Supabase'
          });
        }
        
        return res.status(500).json({ error: 'Failed to fetch data', details: error });
      }

      const data = await response.json();

      if (data.length === 0) {
        return res.status(404).json({
          status: 'empty',
          message: 'No data yet. Use extension on Coinglass page to send data.'
        });
      }

      return res.status(200).json({
        status: 'success',
        count: data.length,
        data: data
      });
    }

    // ===== POST: Store data =====
    if (req.method === 'POST') {
      const body = req.body;
      
      if (!body?.longPercent || !body?.shortPercent) {
        return res.status(400).json({ 
          error: 'Missing required fields: longPercent, shortPercent' 
        });
      }

      const payload = {
        long_percent: body.longPercent,
        short_percent: body.shortPercent,
        long_volume: body.longVolume || null,
        short_volume: body.shortVolume || null,
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
      
      console.log('✅ Data stored:', payload);
      
      return res.status(200).json({
        success: true,
        inserted: result[0] || payload,
        message: 'Data stored in Supabase'
      });
    }

    // Invalid method
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('❌ Handler error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    });
  }
}
