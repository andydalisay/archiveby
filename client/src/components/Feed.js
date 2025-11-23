import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');

  const MAX_CHARS = 280;

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
    if (newPost.length > MAX_CHARS) {
      alert(`Post must be ${MAX_CHARS} characters or less`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
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

  const deletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      fetchPosts();
    } catch (error) {
      alert(error.message);
    }
  };

  const startEdit = (post) => {
    setEditingPost(post.id);
    setEditContent(post.content);
  };

  const cancelEdit = () => {
    setEditingPost(null);
    setEditContent('');
  };

  const saveEdit = async (postId) => {
    if (!editContent.trim()) return;
    if (editContent.length > MAX_CHARS) {
      alert(`Post must be ${MAX_CHARS} characters or less`);
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent })
        .eq('id', postId);

      if (error) throw error;
      setEditingPost(null);
      setEditContent('');
      fetchPosts();
    } catch (error) {
      alert(error.message);
    }
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    return postDate.toLocaleDateString();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const remainingChars = MAX_CHARS - newPost.length;
  const editRemainingChars = MAX_CHARS - editContent.length;

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
            style={{
              ...styles.textarea,
              borderColor: remainingChars < 0 ? '#dc3545' : '#ddd',
            }}
            rows="3"
            maxLength={MAX_CHARS}
          />
          <div style={styles.postFooter}>
            <span
              style={{
                ...styles.charCounter,
                color: remainingChars < 20 ? '#dc3545' : '#666',
              }}
            >
              {remainingChars} characters remaining
            </span>
            <button
              type="submit"
              disabled={loading || remainingChars < 0}
              style={{
                ...styles.postButton,
                opacity: loading || remainingChars < 0 ? 0.5 : 1,
              }}
            >
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
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
                <span style={styles.postDate}>{getRelativeTime(post.created_at)}</span>
              </div>

              {editingPost === post.id ? (
                <div style={styles.editForm}>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    style={{
                      ...styles.textarea,
                      borderColor: editRemainingChars < 0 ? '#dc3545' : '#ddd',
                    }}
                    rows="3"
                    maxLength={MAX_CHARS}
                  />
                  <div style={styles.editFooter}>
                    <span
                      style={{
                        ...styles.charCounter,
                        color: editRemainingChars < 20 ? '#dc3545' : '#666',
                      }}
                    >
                      {editRemainingChars} characters remaining
                    </span>
                    <div style={styles.editButtons}>
                      <button onClick={cancelEdit} style={styles.cancelButton}>
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(post.id)}
                        style={styles.saveButton}
                        disabled={editRemainingChars < 0}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p style={styles.postContent}>{post.content}</p>
                  {post.user_id === user.id && (
                    <div style={styles.postActions}>
                      <button onClick={() => startEdit(post)} style={styles.editButton}>
                        Edit
                      </button>
                      <button onClick={() => deletePost(post.id)} style={styles.deleteButton}>
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
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
  postFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCounter: {
    fontSize: '0.85rem',
  },
  postButton: {
    padding: '0.75rem 1.5rem',
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
    marginBottom: '0.5rem',
  },
  postActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1rem',
  },
  editButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  editFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#666',
    padding: '2rem',
  },
};

export default Feed;
