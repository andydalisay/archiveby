# Quick Start Guide

## What You Have Now

A complete social media app with:
- User authentication (signup/login)
- Post creation
- Social feed
- User profiles (automatic)

## Next Steps (Do These in Order!)

### Step 1: Set Up Supabase (5 minutes)

1. Go to https://supabase.com and sign up (free)
2. Click "New Project"
3. Fill in:
   - Project name: `my-social-app` (or whatever you like)
   - Database password: (save this somewhere!)
   - Region: Choose closest to you
4. Click "Create new project" and wait 2-3 minutes

### Step 2: Set Up Database (2 minutes)

1. In your Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New Query"
3. Copy ALL the SQL from the README.md (under "Set Up Database Schema")
4. Paste it into the query editor
5. Click "Run" (or press Cmd+Enter)
6. You should see "Success. No rows returned"

### Step 3: Get Your API Keys (1 minute)

1. In Supabase, go to Project Settings (gear icon) > API
2. Copy two things:
   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **anon public key** (long string of characters)

### Step 4: Configure Your App (2 minutes)

1. In your `social-media-app/client` folder, create a file called `.env`:
   ```
   REACT_APP_SUPABASE_URL=paste_your_project_url_here
   REACT_APP_SUPABASE_ANON_KEY=paste_your_anon_key_here
   ```

2. Replace the values with what you copied in Step 3

### Step 5: Run Your App Locally (1 minute)

Open terminal and run:
```bash
cd ~/social-media-app/client
npm start
```

Your app will open at http://localhost:3000

### Step 6: Test It Out

1. Create an account (use a real email - you'll get a confirmation email)
2. Check your email and click the confirmation link
3. Log in and create your first post!

### Step 7: Deploy to Vercel (5 minutes)

When you're ready to go live:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy (from the client folder)
cd ~/social-media-app/client
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? (Choose your account)
- Link to existing project? **N**
- What's your project's name? **my-social-app** (or your choice)
- In which directory is your code located? **.**
- Want to override settings? **N**

When asked for environment variables, add:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

Done! Your app is live on a free Vercel URL.

## Troubleshooting

**"Invalid API key"**: Check your .env file has the correct values with no extra spaces

**"Can't create posts"**: Make sure you ran the SQL schema in Step 2

**Email confirmation not arriving**: Check spam folder, or use a different email provider

**App won't start**: Make sure you're in the `client` folder when running `npm start`

## Current Costs

- Supabase: **$0/month** (free tier)
- Vercel: **$0/month** (free tier)
- Domain (optional): **~$12/year**

**Total: FREE!**

## What's Next?

Once your app is running, you can add:
- User profile pages
- Like/comment on posts
- Image uploads
- Follow/unfollow users
- Direct messaging
- Notifications

Check the main README.md for more details!
