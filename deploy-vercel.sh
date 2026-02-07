#!/bin/bash
# deploy-vercel.sh - Deploy Vercel API with security setup

echo "🚀 Coinglass Vercel API Deployer"
echo "================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Create .env.example if not exists
if [ ! -f .env.example ]; then
cat > .env.example <<EOF
# Optional security (recommended for production)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
WEBHOOK_SECRET=your_strong_secret_here

# Optional database connections (uncomment if using)
# SUPABASE_URL=your_supabase_url
# SUPABASE_KEY=your_supabase_anon_key
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
EOF
    echo "✅ Created .env.example template"
fi

# Prompt for environment setup
echo -e "\n🔐 Security Setup (recommended):"
read -p "Generate new webhook secret? (y/n): " gen_secret
if [[ $gen_secret == "y" || $gen_secret == "Y" ]]; then
    SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "🔑 Your new webhook secret: $SECRET"
    echo -e "\n⚠️  SAVE THIS SECRET! You'll need it in your Chrome extension"
    
    # Create .env.local for local development
    echo "WEBHOOK_SECRET=$SECRET" > .env.local
    echo "✅ Created .env.local with secret"
    
    # Update extension background.js with secret (optional)
    echo -e "\n💡 To use this secret in your extension:"
    echo "   1. Open extension/background.js"
    echo "   2. Uncomment the secret validation section"
    echo "   3. Add this header to fetch requests:"
    echo "      'X-Webhook-Secret': '$SECRET'"
fi

# Deploy to Vercel
echo -e "\n☁️  Deploying to Vercel..."
if vercel --version &> /dev/null; then
    vercel --prod
    DEPLOY_URL=$(vercel --prod --confirm 2>&1 | grep "https://" | head -1)
    
    echo -e "\n✅ Deployment successful!"
    echo "🔗 Your API endpoint: $DEPLOY_URL/api/data"
    
    # Auto-update extension manifest with deployed URL
    if [ -f "extension/background.js" ]; then
        echo -e "\n🔄 Updating extension with new endpoint URL..."
        sed -i.bak "s|https://your-vercel-endpoint.vercel.app/api/data|$DEPLOY_URL/api/data|g" extension/background.js
        rm -f extension/background.js.bak
        echo "✅ extension/background.js updated with new endpoint"
        
        echo -e "\n📦 Next steps:"
        echo "   1. Load extension folder in Chrome (chrome://extensions)"
        echo "   2. Visit https://www.coinglass.com/LongShortRatio"
        echo "   3. Check Vercel logs: vercel logs $DEPLOY_URL"
    fi
else
    echo "❌ Vercel CLI not properly installed. Deploy manually:"
    echo "   vercel login"
    echo "   vercel --prod"
fi

echo -e "\n🎉 Setup complete! Documentation: https://github.com/yourusername/coinglass-vercel-extension"
