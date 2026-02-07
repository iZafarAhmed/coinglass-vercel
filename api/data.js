// api/data.js
export default async function handler(req, res) {
  // Handle CORS (critical for extension communication)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Coinglass-Extension, Authorization'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed', 
      allowed: ['POST'] 
    });
  }

  try {
    // Optional: Add security validation (UNCOMMENT AND CONFIGURE FOR PRODUCTION)
    // const SECRET_KEY = process.env.WEBHOOK_SECRET;
    // const clientKey = req.headers['x-webhook-secret'];
    // if (SECRET_KEY && clientKey !== SECRET_KEY) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    const data = req.body;
    
    // Validate required fields
    if (!data.longPercent || !data.shortPercent || !data.timestamp) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        received: Object.keys(data) 
      });
    }

    // PROCESS DATA HERE (Examples):
    // 1. Log to console (visible in Vercel logs)
    console.log('[COINGLASS_DATA]', JSON.stringify(data, null, 2));
    
    // 2. Store in database (EXAMPLE - uncomment and configure):
    // await saveToDatabase(data);
    
    // 3. Send to Slack/Discord (EXAMPLE):
    // await notifyWebhook(data);
    
    // 4. Save to Vercel KV (if enabled):
    // if (process.env.VERCEL_KV_REST_API_URL) {
    //   await fetch(`${process.env.VERCEL_KV_REST_API_URL}/set/coinglass:${Date.now()}`, {
    //     method: 'POST',
    //     headers: { authorization: `Bearer ${process.env.VERCEL_KV_REST_API_TOKEN}` },
    //     body: JSON.stringify(data)
    //   });
    // }

    // Return success response
    return res.status(200).json({
      success: true,
      received: {
        long: data.longPercent,
        short: data.shortPercent,
        volume: data.longVolume,
        timeframe: data.timeframe,
        timestamp: data.timestamp
      },
      message: 'Data processed successfully'
    });

  } catch (error) {
    console.error('[API_ERROR]', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Example database function (uncomment and configure)
// async function saveToDatabase(data) {
//   // Example using Supabase
//   // const { createClient } = require('@supabase/supabase-js');
//   // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
//   // await supabase.from('coinglass_data').insert(data);
//   
//   // Example using MongoDB
//   // const { MongoClient } = require('mongodb');
//   // const client = new MongoClient(process.env.MONGODB_URI);
//   // await client.db('crypto').collection('longshort').insertOne(data);
// }
