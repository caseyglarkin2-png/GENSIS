# 🚀 GO LIVE NOW - Step-by-Step Guide

## Your Platform Is Ready to Deploy ✅

All code is committed and pushed to GitHub:
**https://github.com/caseyglarkin2-png/GENSIS**

---

## Option 1: Deploy via Vercel Dashboard (Fastest - 5 Minutes)

### Step 1: Sign Up / Login to Vercel
1. Go to **https://vercel.com**
2. Click "Sign Up" or "Login"
3. Use GitHub to sign in (easiest)

### Step 2: Import Your GitHub Repository
1. Click **"Add New..."** → **"Project"**
2. Select **"Import Git Repository"**
3. Find **caseyglarkin2-png/GENSIS**
4. Click **"Import"**

### Step 3: Configure Environment Variables
Before deploying, add these environment variables:

#### Required Variables:
```bash
# Database (use Neon - instructions below)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# Mapbox API (for maps)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_public_token
MAPBOX_SECRET_TOKEN=sk.your_mapbox_secret_token

# Application URL (Vercel will provide this)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Admin User (temporary)
ADMIN_USER_ID=00000000-0000-0000-0000-000000000001
ADMIN_USER_EMAIL=admin@facilitycommand.com
```

### Step 4: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for build
3. Get your live URL: `https://gensis-xxx.vercel.app`

---

## Setting Up Required Services

### 🗄️ Database: Neon (Free PostgreSQL with PostGIS)

1. **Sign up**: https://neon.tech
2. **Create project**: "Facility Command Center"
3. **Select region**: US East or West
4. **Enable PostGIS**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
5. **Copy connection string** from dashboard
6. **Add to Vercel** environment variables as `DATABASE_URL`

### 🗺️ Maps: Mapbox (Free tier: 50k requests/month)

1. **Sign up**: https://www.mapbox.com
2. **Go to Account** → **Access tokens**
3. **Copy default public token** → Use as `NEXT_PUBLIC_MAPBOX_TOKEN`
4. **Create secret token** (for geocoding) → Use as `MAPBOX_SECRET_TOKEN`
5. **Add to Vercel** environment variables

---

## After First Deployment

### Step 1: Run Database Migration

You have two options:

#### Option A: From Your Local Machine
```bash
# Set DATABASE_URL to your Neon database
export DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Run migration
npx prisma migrate deploy
npx prisma generate
```

#### Option B: From Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Run migration via Vercel shell
vercel env pull .env.production.local
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### Step 2: Seed Initial Data

Create a temporary API route to seed data:

**`src/app/api/admin/seed/route.ts`**:
```typescript
import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Create Freightroll organization
    const freightroll = await prisma.organization.create({
      data: {
        name: "Freightroll",
        type: "PLATFORM_ADMIN",
        planTier: "enterprise",
        features: ["ai_insights", "templates", "api_access", "white_label"],
        isActive: true
      }
    });

    // Create Primo organization
    const primo = await prisma.organization.create({
      data: {
        name: "Primo",
        type: "CUSTOMER",
        brandName: "Primo Logistics Network Manager",
        logoUrl: "https://primo.com/logo.png",
        primaryColor: "#003DA5",
        planTier: "enterprise",
        features: ["ai_insights", "templates", "white_label"],
        isActive: true,
        industry: "logistics",
        companySize: "large"
      }
    });

    // Create sample templates
    const templates = [
      {
        name: "3PL Multi-Customer Network",
        description: "Cross-dock focused with high throughput",
        industry: "3pl",
        facilityTypes: ["cross_dock", "warehouse"],
        defaultMetrics: { avgTurnTimeMinutes: 60 },
        roiDefaults: { costPerMinuteDetention: 1.5 },
        isPublic: true,
        isFeatured: true
      },
      {
        name: "Retail Distribution Network",
        description: "Store delivery with high-frequency routes",
        industry: "retail",
        facilityTypes: ["distribution_center"],
        defaultMetrics: { avgTurnTimeMinutes: 45 },
        roiDefaults: { costPerMinuteDetention: 1.75 },
        isPublic: true,
        isFeatured: true
      }
    ];

    for (const template of templates) {
      await prisma.networkTemplate.create({ data: template });
    }

    return NextResponse.json({
      success: true,
      data: {
        freightroll: freightroll.id,
        primo: primo.id,
        templatesCreated: templates.length
      }
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

Then call it once:
```bash
curl -X POST https://your-app.vercel.app/api/admin/seed
```

### Step 3: Test Your Live App

1. Visit: `https://your-app.vercel.app`
2. Should see homepage
3. Try creating a network
4. Import some facilities

---

## Option 2: Deploy via GitHub (Automatic)

### Setup Auto-Deploy from GitHub:
1. Connect Vercel to your GitHub repo
2. Every push to `main` automatically deploys
3. Every PR gets a preview URL

**To enable:**
1. In Vercel dashboard → Your project → Settings
2. Git → Connect Repository
3. Select `caseyglarkin2-png/GENSIS`
4. Enable "Automatic deployments"

---

## What You Get When Live

### Your Live URLs:
- **Main app**: `https://gensis-xxx.vercel.app`
- **Custom domains** (optional):
  - `facilities.freightroll.com` (your main platform)
  - `facilities.primo.com` (Primo's white-labeled version)

### Features Working Out of the Box:
✅ Homepage with CTAs  
✅ Network creation  
✅ Facility management  
✅ CSV import  
✅ Interactive maps (if Mapbox configured)  
✅ ROI calculations  
✅ Data confidence scoring  
✅ Audit logging  

### Features Requiring UI Build:
⏳ Onboarding wizard (5-step flow)  
⏳ AI insights dashboard  
⏳ Template selector  
⏳ White-label branding UI  

---

## Performance & Scaling

### Vercel Free Tier Limits:
- ✅ **100GB bandwidth/month** (enough for hundreds of users)
- ✅ **Unlimited requests**
- ✅ **Serverless functions** (API routes)
- ✅ **Edge network** (fast worldwide)

### When to Upgrade:
- 🚀 **Pro Plan ($20/mo)**: More bandwidth, faster builds
- 🚀 **Enterprise**: Custom domains, dedicated support

---

## Monitoring & Maintenance

### Vercel Dashboard Shows:
- 📊 **Deployment history** (every commit)
- 📈 **Analytics** (page views, performance)
- 🐛 **Error logs** (runtime errors)
- ⚡ **Build logs** (deployment status)

### To Update Live App:
```bash
# Just push to GitHub
git add .
git commit -m "Your update"
git push origin main

# Vercel auto-deploys in 2-3 minutes
```

---

## Quick Troubleshooting

### Build Fails
- Check Vercel logs for errors
- Most common: Missing environment variables
- Fix: Add vars in Vercel dashboard → Settings → Environment Variables

### Database Connection Fails
- Verify `DATABASE_URL` is correct
- Check Neon database is active
- Ensure connection string has `?sslmode=require`

### Map Not Loading
- Check `NEXT_PUBLIC_MAPBOX_TOKEN` is set
- Verify token is public (starts with `pk.`)
- Check Mapbox dashboard for usage limits

---

## 🎉 You're Live!

Once deployed, share:
- **Live URL**: `https://your-app.vercel.app`
- **GitHub**: https://github.com/caseyglarkin2-png/GENSIS
- **Docs**: All `.md` files in repo

### Next Steps After Going Live:
1. ✅ Test core features
2. ✅ Invite Primo for pilot
3. ✅ Build onboarding wizard UI
4. ✅ Deploy AI insights job
5. ✅ Add custom domains
6. ✅ Scale to more customers

---

## Need Help?

### Vercel Support:
- Docs: https://vercel.com/docs
- Community: https://github.com/vercel/vercel/discussions

### Your Documentation:
- [QUICK_START.md](QUICK_START.md) - Full deployment guide
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Step-by-step tasks
- [EXECUTIVE_SUMMARY.md](EXECUTIVE_SUMMARY.md) - Business overview

---

## 🚀 Deploy Now!

**Go to**: https://vercel.com/new/import

**Import**: `caseyglarkin2-png/GENSIS`

**Time to live**: 5 minutes ⚡

Let's go! 💪
