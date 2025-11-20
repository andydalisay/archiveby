const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

// Posts routes
app.get('/api/posts', async (req, res) => {
  try {
    // TODO: Fetch posts from Supabase
    res.json({ message: 'Get all posts' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    // TODO: Create post in Supabase
    const { content, user_id } = req.body;
    res.json({ message: 'Create post', content, user_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
