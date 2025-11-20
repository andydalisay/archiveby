# Simple Social Media App

A minimal social media application built with React, Node.js, and Supabase.

## Tech Stack

- **Frontend**: React
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Vercel (frontend), Supabase (backend/db)

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the database to be set up (2-3 minutes)
4. Go to Project Settings > API to find your:
   - Project URL
   - Anon/Public Key

### 2. Set Up Database Schema

In your Supabase project, go to the SQL Editor and run these commands:

```sql
-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create posts table
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies for posts
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, SPLIT_PART(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Configure Environment Variables

#### Client (React)
Create `client/.env`:
```
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Server (Node.js)
Create `server/.env`:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=5000
```

### 4. Install Dependencies and Run Locally

#### Run Client
```bash
cd client
npm install
npm start
```

The app will open at http://localhost:3000

#### Run Server (Optional - currently all operations use Supabase directly)
```bash
cd server
npm install
npm start
```

Server runs at http://localhost:5000

### 5. Deploy to Vercel

#### Deploy Frontend
```bash
cd client
npm install -g vercel
vercel
```

Follow the prompts and add your environment variables when asked.

#### Configure Environment Variables in Vercel
Go to your project settings in Vercel dashboard and add:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

## Features

- User authentication (sign up, sign in, sign out)
- Create posts
- View feed of all posts
- Automatic profile creation on signup

## Cost Breakdown

- **Supabase**: Free tier (500MB database, 50,000 monthly active users)
- **Vercel**: Free tier (unlimited projects, 100GB bandwidth)
- **Domain**: ~$10-15/year (optional, you get a free Vercel subdomain)

**Total: FREE** (or $10-15/year with custom domain)

## Next Steps to Expand

1. Add user profiles page
2. Add like/comment functionality
3. Add image upload support
4. Add follow/unfollow users
5. Add real-time updates with Supabase subscriptions
6. Add notifications
7. Add direct messaging

## Project Structure

```
social-media-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth.js    # Login/Signup component
│   │   │   └── Feed.js    # Main feed component
│   │   ├── supabaseClient.js
│   │   └── App.js
│   └── package.json
├── server/                 # Node.js backend (optional)
│   ├── index.js
│   └── package.json
└── README.md
```
