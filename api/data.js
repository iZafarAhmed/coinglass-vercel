// api/data.js

// Simple in-memory store (resets on function cold start)
let lastData = null;

export default async function handler(req, res) {
  // ===== CORS HEADERS =====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Coinglass-Extension');
  res.setHeader('Access-Control-Max-Age', '86400');

  // ===== HANDLE PREFLIGHT =====
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // ===== HANDLE GET REQUEST (Show data in browser) =====
  if (req.method === 'GET') {
    // Try to get from Vercel KV first (if available)
    try {
      const stored = await kv.get('coinglass:last_data');
      if (stored) {
        return res.status(200).json({
          status: 'success',
          source: 'vercel_kv',
          data: stored,
          last_updated: new Date(stored.timestamp).toLocaleString()
        });
      }
    } catch (e) {
      // KV not configured, fall through to memory
    }

    // Fall back to in-memory storage
    if (lastData) {
      return res.status(200).json({
        status: 'success',
        source: 'memory',
        data: lastData,
        last_updated: new Date(lastData.timestamp).toLocaleString(),
        warning: 'Using in-memory storage (resets on cold start). For persistent storage, configure Vercel KV.'
      });
    }

    return res.status(404).json({
      status: 'empty',
      message: 'No data received yet. Visit Coinglass page and use the extension to send data.'
    });
  }

  // ===== HANDLE POST REQUEST (From extension) =====
  if (req.method === 'POST') {
    try {
      const data = req.body;

      // Validate payload
      if (!data || !data.longPercent || !data.shortPercent) {
        return res.status(400).json({ 
          error: 'Invalid payload',
          required: ['longPercent', 'shortPercent'] 
        });
      }

      // Store data
      lastData = {
        longPercent: data.longPercent,
        shortPercent: data.shortPercent,
        longVolume: data.longVolume,
        shortVolume: data.shortVolume,
        timeframe: data.timeframe,
        timestamp: data.timestamp || new Date().toISOString(),
        url: data.url
      };

      // Save to Vercel KV (if available)
      try {
        await kv.set('coinglass:last_data', lastData, { ex: 86400 }); // 24h expiry
      } catch (e) {
        console.log('KV not configured or failed:', e.message);
      }

      // Log to console
      console.log('✅ [COINGLASS_DATA]', JSON.stringify(lastData, null, 2));

      // Return success
      return res.status(200).json({
        success: true,
        received: lastData,
        message: 'Data stored successfully'
      });

    } catch (error) {
      console.error('❌ [API_ERROR]', error);
      return res.status(500).json({ 
        error: 'Processing failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // ===== INVALID METHOD =====
  return res.status(405).json({ 
    error: 'Method not allowed', 
    allowed: ['GET', 'POST', 'OPTIONS'] 
  });
}
