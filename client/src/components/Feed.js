import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error.message);
    }
  };

  const createPost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            content: newPost,
            user_id: user.id,
          },
        ])
        .select();

      if (error) throw error;
      setNewPost('');
      fetchPosts();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Social Feed</h1>
        <div>
          <span style={styles.userEmail}>{user.email}</span>
          <button onClick={handleSignOut} style={styles.signOutButton}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={styles.createPost}>
        <form onSubmit={createPost} style={styles.form}>
          <textarea
            placeholder="What's on your mind?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            style={styles.textarea}
            rows="3"
          />
          <button type="submit" disabled={loading} style={styles.postButton}>
            {loading ? 'Posting...' : 'Post'}
          </button>
        </form>
      </div>

      <div style={styles.posts}>
        {posts.length === 0 ? (
          <p style={styles.emptyMessage}>No posts yet. Be the first to post!</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} style={styles.post}>
              <div style={styles.postHeader}>
                <strong>User {post.user_id.substring(0, 8)}</strong>
                <span style={styles.postDate}>
                  {new Date(post.created_at).toLocaleString()}
                </span>
              </div>
              <p style={styles.postContent}>{post.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  userEmail: {
    marginRight: '1rem',
    fontSize: '0.9rem',
    color: '#666',
  },
  signOutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  createPost: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  postButton: {
    padding: '0.75rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  posts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  post: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  postHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
  },
  postDate: {
    color: '#666',
    fontSize: '0.8rem',
  },
  postContent: {
    margin: 0,
    lineHeight: '1.5',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#666',
    padding: '2rem',
  },
};

export default Feed;
