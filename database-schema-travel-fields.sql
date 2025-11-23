-- Add travel metadata columns to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS trip_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS hashtags TEXT;

-- Create index for faster queries on country
CREATE INDEX IF NOT EXISTS idx_posts_country ON posts(country);

-- Create index for faster queries on trip_type
CREATE INDEX IF NOT EXISTS idx_posts_trip_type ON posts(trip_type);

-- Comment for documentation
COMMENT ON COLUMN posts.country IS 'Destination country for travel posts';
COMMENT ON COLUMN posts.duration IS 'Trip duration (e.g., "5 days", "2 weeks")';
COMMENT ON COLUMN posts.trip_type IS 'Type of trip: Luxury, Adventure, Casual, Wellness, Eco';
COMMENT ON COLUMN posts.hashtags IS 'Space-separated hashtags for the post';
