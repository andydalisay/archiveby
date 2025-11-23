import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme } from '../ThemeContext';
import Profile from './Profile';

function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [likes, setLikes] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);

  const MAX_CHARS = 280;
  const { colors, darkMode, toggleDarkMode } = useTheme();

  useEffect(() => {
    fetchPosts();
    fetchLikes();
  }, []);

  useEffect(() => {
    // Filter posts based on search query
    if (searchQuery.trim() === '') {
      setFilteredPosts(posts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = posts.filter(post =>
        post.content.toLowerCase().includes(query) ||
        post.user_id.toLowerCase().includes(query)
      );
      setFilteredPosts(filtered);
    }
  }, [searchQuery, posts]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
      setFilteredPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error.message);
    }
  };

  const fetchLikes = async () => {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('post_id, user_id');

      if (error) throw error;

      // Create a map of post_id -> {count, userLiked}
      const likesMap = {};
      data.forEach(like => {
        if (!likesMap[like.post_id]) {
          likesMap[like.post_id] = { count: 0, userLiked: false };
        }
        likesMap[like.post_id].count++;
        if (like.user_id === user.id) {
          likesMap[like.post_id].userLiked = true;
        }
      });
      setLikes(likesMap);
    } catch (error) {
      console.error('Error fetching likes:', error.message);
    }
  };

  const toggleLike = async (postId) => {
    const isLiked = likes[postId]?.userLiked;

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert([{ post_id: postId, user_id: user.id }]);

        if (error) throw error;
      }

      fetchLikes();
    } catch (error) {
      alert(error.message);
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

  if (showProfile) {
    return <Profile user={user} onBack={() => setShowProfile(false)} />;
  }

  const styles = {
    container: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '1rem',
      minHeight: '100vh',
      backgroundColor: colors.background,
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      padding: '1rem',
      backgroundColor: colors.cardBackground,
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      color: colors.text,
    },
    headerButtons: {
      display: 'flex',
      gap: '0.5rem',
      alignItems: 'center',
    },
    userEmail: {
      marginRight: '1rem',
      fontSize: '0.9rem',
      color: colors.textSecondary,
    },
    themeToggle: {
      padding: '0.5rem 1rem',
      backgroundColor: colors.textSecondary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginRight: '0.5rem',
    },
    profileButton: {
      padding: '0.5rem 1rem',
      backgroundColor: colors.primary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginRight: '0.5rem',
    },
    signOutButton: {
      padding: '0.5rem 1rem',
      backgroundColor: colors.danger,
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    searchBar: {
      backgroundColor: colors.cardBackground,
      padding: '1rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '1rem',
    },
    searchInput: {
      width: '100%',
      padding: '0.75rem',
      border: `1px solid ${colors.border}`,
      borderRadius: '4px',
      fontSize: '1rem',
      backgroundColor: colors.background,
      color: colors.text,
      boxSizing: 'border-box',
    },
    createPost: {
      backgroundColor: colors.cardBackground,
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
      border: `1px solid ${colors.border}`,
      borderRadius: '4px',
      fontSize: '1rem',
      fontFamily: 'inherit',
      resize: 'vertical',
      backgroundColor: colors.background,
      color: colors.text,
    },
    postFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    charCounter: {
      fontSize: '0.85rem',
      color: colors.textSecondary,
    },
    postButton: {
      padding: '0.75rem 1.5rem',
      backgroundColor: colors.primary,
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
      backgroundColor: colors.cardBackground,
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      color: colors.text,
    },
    postHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '0.5rem',
      fontSize: '0.9rem',
    },
    postDate: {
      color: colors.textSecondary,
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
      alignItems: 'center',
    },
    likeButton: {
      padding: '0.4rem 0.8rem',
      backgroundColor: 'transparent',
      color: colors.text,
      border: `1px solid ${colors.border}`,
      borderRadius: '4px',
      fontSize: '0.85rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.3rem',
    },
    likeButtonActive: {
      padding: '0.4rem 0.8rem',
      backgroundColor: colors.danger,
      color: 'white',
      border: `1px solid ${colors.danger}`,
      borderRadius: '4px',
      fontSize: '0.85rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.3rem',
    },
    editButton: {
      padding: '0.4rem 0.8rem',
      backgroundColor: colors.success,
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '0.85rem',
      cursor: 'pointer',
    },
    deleteButton: {
      padding: '0.4rem 0.8rem',
      backgroundColor: colors.danger,
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
      backgroundColor: colors.textSecondary,
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '0.9rem',
      cursor: 'pointer',
    },
    saveButton: {
      padding: '0.5rem 1rem',
      backgroundColor: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '0.9rem',
      cursor: 'pointer',
    },
    emptyMessage: {
      textAlign: 'center',
      color: colors.textSecondary,
      padding: '2rem',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Social Feed</h1>
        <div style={styles.headerButtons}>
          <span style={styles.userEmail}>{user.email}</span>
          <button onClick={toggleDarkMode} style={styles.themeToggle}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setShowProfile(true)} style={styles.profileButton}>
            Profile
          </button>
          <button onClick={handleSignOut} style={styles.signOutButton}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="Search posts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.createPost}>
        <form onSubmit={createPost} style={styles.form}>
          <textarea
            placeholder="What's on your mind?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            style={{
              ...styles.textarea,
              borderColor: remainingChars < 0 ? colors.danger : colors.border,
            }}
            rows="3"
            maxLength={MAX_CHARS}
          />
          <div style={styles.postFooter}>
            <span
              style={{
                ...styles.charCounter,
                color: remainingChars < 20 ? colors.danger : colors.textSecondary,
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
        {filteredPosts.length === 0 ? (
          <p style={styles.emptyMessage}>
            {searchQuery ? 'No posts found matching your search.' : 'No posts yet. Be the first to post!'}
          </p>
        ) : (
          filteredPosts.map((post) => (
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
                      borderColor: editRemainingChars < 0 ? colors.danger : colors.border,
                    }}
                    rows="3"
                    maxLength={MAX_CHARS}
                  />
                  <div style={styles.editFooter}>
                    <span
                      style={{
                        ...styles.charCounter,
                        color: editRemainingChars < 20 ? colors.danger : colors.textSecondary,
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
                  <div style={styles.postActions}>
                    <button
                      onClick={() => toggleLike(post.id)}
                      style={likes[post.id]?.userLiked ? styles.likeButtonActive : styles.likeButton}
                    >
                      {likes[post.id]?.userLiked ? '❤️' : '🤍'} {likes[post.id]?.count || 0}
                    </button>
                    {post.user_id === user.id && (
                      <>
                        <button onClick={() => startEdit(post)} style={styles.editButton}>
                          Edit
                        </button>
                        <button onClick={() => deletePost(post.id)} style={styles.deleteButton}>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Feed;
