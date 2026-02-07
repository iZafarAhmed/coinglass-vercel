// api/data.js
// ✅ ES Module syntax (requires "type": "module" in package.json)
// ✅ Full CORS support
// ✅ Input validation
// ✅ Error handling
// ✅ Clean logging

export default async function handler(req, res) {
  // ===== CORS HEADERS (CRITICAL FOR EXTENSION) =====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Coinglass-Extension, X-Webhook-Secret');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours cache

  // ===== HANDLE PREFLIGHT REQUESTS =====
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ 
      success: true, 
      message: 'CORS preflight successful' 
    });
  }

  // ===== VALIDATE REQUEST METHOD =====
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed', 
      allowed: ['POST', 'OPTIONS'] 
    });
  }

  try {
    // ===== SECURITY: Validate webhook secret (UNCOMMENT FOR PRODUCTION) =====
    // const SECRET = process.env.WEBHOOK_SECRET;
    // const clientSecret = req.headers['x-webhook-secret'];
    // if (SECRET && clientSecret !== SECRET) {
    //   console.warn('⚠️ Unauthorized access attempt:', req.headers['x-forwarded-for']);
    //   return res.status(401).json({ error: 'Invalid authentication' });
    // }

    // ===== VALIDATE PAYLOAD =====
    const data = req.body;
    
    if (!data || !data.longPercent || !data.shortPercent || !data.timestamp) {
      console.warn('⚠️ Invalid payload:', Object.keys(data || {}));
      return res.status(400).json({ 
        error: 'Invalid payload', 
        required: ['longPercent', 'shortPercent', 'timestamp'] 
      });
    }

    // ===== PROCESS DATA (LOG TO CONSOLE) =====
    console.log('✅ [COINGLASS_DATA]', JSON.stringify({
      long: data.longPercent,
      short: data.shortPercent,
      longVol: data.longVolume,
      shortVol: data.shortVolume,
      timeframe: data.timeframe,
      timestamp: data.timestamp
    }, null, 2));

    // ===== OPTIONAL: ADD YOUR DATA HANDLING HERE =====
    // Example 1: Save to database
    // await saveToDatabase(data);
    
    // Example 2: Send to Slack
    // await notifySlack(data);
    
    // Example 3: Store in Vercel KV
    // if (process.env.VERCEL_KV_REST_API_URL) {
    //   await fetch(`${process.env.VERCEL_KV_REST_API_URL}/set/coinglass:${Date.now()}`, {
    //     method: 'POST',
    //     headers: { 
    //       'authorization': `Bearer ${process.env.VERCEL_KV_REST_API_TOKEN}`,
    //       'content-type': 'application/json'
    //     },
    //     body: JSON.stringify(data)
    //   });
    // }

    // ===== SUCCESS RESPONSE =====
    return res.status(200).json({
      success: true,
      received: {
        long: data.longPercent,
        short: data.shortPercent,
        longVolume: data.longVolume,
        shortVolume: data.shortVolume,
        timeframe: data.timeframe || '4 hour',
        timestamp: data.timestamp
      },
      message: 'Data processed successfully'
    });

  } catch (error) {
    // ===== ERROR HANDLING =====
    console.error('❌ [API_ERROR]', error);
    
    // Return safe error message (hide details in production)
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error';
    
    return res.status(500).json({ 
      error: 'Processing failed', 
      details: errorMessage 
    });
  }
}

// ===== OPTIONAL HELPER FUNCTIONS (UNCOMMENT TO USE) =====

// async function saveToDatabase(data) {
//   // Example: Supabase
//   // const { createClient } = await import('@supabase/supabase-js');
//   // const supabase = createClient(
//   //   process.env.SUPABASE_URL, 
//   //   process.env.SUPABASE_KEY
//   // );
//   // await supabase.from('long_short_data').insert(data);
//   
//   // Example: MongoDB
//   // const { MongoClient } = await import('mongodb');
//   // const client = new MongoClient(process.env.MONGODB_URI);
//   // await client.connect();
//   // await client.db('crypto').collection('coinglass').insertOne(data);
//   // await client.close();
// }

// async function notifySlack(data) {
//   if (!process.env.SLACK_WEBHOOK_URL) return;
//   
//   const message = {
//     text: `📊 Coinglass Data Received`,
//     blocks: [
//       {
//         type: "header",
//         text: { type: "plain_text", text: "Coinglass Long/Short Ratio" }
//       },
//       {
//         type: "section",
//         fields: [
//           { type: "mrkdwn", text: `*Long:* ${data.longPercent}` },
//           { type: "mrkdwn", text: `*Short:* ${data.shortPercent}` },
//           { type: "mrkdwn", text: `*Long Vol:* ${data.longVolume}` },
//           { type: "mrkdwn", text: `*Short Vol:* ${data.shortVolume}` },
//           { type: "mrkdwn", text: `*Timeframe:* ${data.timeframe}` },
//           { type: "mrkdwn", text: `*Time:* ${new Date(data.timestamp).toLocaleString()}` }
//         ]
//       }
//     ]
//   };
//   
//   await fetch(process.env.SLACK_WEBHOOK_URL, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(message)
//   });
// }
