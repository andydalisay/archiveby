-- Add columns to posts table for blog-style posts
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS post_type VARCHAR(20) DEFAULT 'text';

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'posts');

-- Allow public read access to post images
CREATE POLICY "Public can read post images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'posts');

-- Allow users to delete their own post images
CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'posts' AND owner = auth.uid());

-- Create index for faster queries on post_type
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);

-- Comment for documentation
COMMENT ON COLUMN posts.title IS 'Title for blog-style posts';
COMMENT ON COLUMN posts.blocks IS 'JSON array of content blocks for blog posts';
COMMENT ON COLUMN posts.post_type IS 'Type of post: text or blog';
