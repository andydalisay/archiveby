-- Advanced Features Database Schema
-- Copy and paste this into Supabase SQL Editor

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security on comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Enable Row Level Security on follows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Create policies for follows
CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'like', 'comment', 'follow'
  related_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Create function to create notification on like
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

  -- Don't create notification if user likes their own post
  IF post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, related_user_id, post_id)
    VALUES (post_owner_id, 'like', NEW.user_id, NEW.post_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for like notifications
DROP TRIGGER IF EXISTS on_like_created ON likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION create_like_notification();

-- Create function to create notification on comment
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  -- Get the post owner
  SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

  -- Don't create notification if user comments on their own post
  IF post_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, type, related_user_id, post_id, comment_id)
    VALUES (post_owner_id, 'comment', NEW.user_id, NEW.post_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for comment notifications
DROP TRIGGER IF EXISTS on_comment_created ON comments;
CREATE TRIGGER on_comment_created
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION create_comment_notification();

-- Create function to create notification on follow
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, related_user_id)
  VALUES (NEW.following_id, 'follow', NEW.follower_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for follow notifications
DROP TRIGGER IF EXISTS on_follow_created ON follows;
CREATE TRIGGER on_follow_created
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION create_follow_notification();
