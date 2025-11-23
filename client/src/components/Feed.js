import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme } from '../ThemeContext';
import Profile from './Profile';
import Notifications from './Notifications';
import PostEditor from './PostEditor';
import PostRenderer from './PostRenderer';

function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [showingComments, setShowingComments] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [follows, setFollows] = useState({});
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showPostMenu, setShowPostMenu] = useState({});
  const [showBlogEditor, setShowBlogEditor] = useState(false);
  const [viewingPost, setViewingPost] = useState(null);
  const [countryFilter, setCountryFilter] = useState('');
  const [durationFilter, setDurationFilter] = useState('');
  const [holidayTypeFilter, setHolidayTypeFilter] = useState('');

  const MAX_CHARS = 280;
  const { colors, darkMode, toggleDarkMode } = useTheme();

  useEffect(() => {
    fetchPosts();
    fetchLikes();
    fetchFollows();
    fetchUnreadNotifications();

    // Real-time subscriptions
    const postsSubscription = supabase
      .channel('posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    const likesSubscription = supabase
      .channel('likes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
        fetchLikes();
      })
      .subscribe();

    const commentsSubscription = supabase
      .channel('comments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchAllComments();
      })
      .subscribe();

    const notificationsSubscription = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchUnreadNotifications();
      })
      .subscribe();

    return () => {
      postsSubscription.unsubscribe();
      likesSubscription.unsubscribe();
      commentsSubscription.unsubscribe();
      notificationsSubscription.unsubscribe();
    };
  }, [user.id]);

  useEffect(() => {
    let filtered = posts;

    // Apply search query filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(post =>
        post.content.toLowerCase().includes(query) ||
        post.user_id.toLowerCase().includes(query) ||
        (post.title && post.title.toLowerCase().includes(query)) ||
        (post.hashtags && post.hashtags.toLowerCase().includes(query))
      );
    }

    // Apply country filter
    if (countryFilter) {
      filtered = filtered.filter(post => post.country === countryFilter);
    }

    // Apply duration filter
    if (durationFilter) {
      filtered = filtered.filter(post => post.duration === durationFilter);
    }

    // Apply holiday type filter
    if (holidayTypeFilter) {
      filtered = filtered.filter(post => post.trip_type === holidayTypeFilter);
    }

    setFilteredPosts(filtered);
  }, [searchQuery, posts, countryFilter, durationFilter, holidayTypeFilter]);

  const fetchUnreadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      setUnreadNotifications(data?.length || 0);
    } catch (error) {
      console.error('Error fetching unread notifications:', error.message);
    }
  };

  const fetchFollows = async () => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id, following_id');

      if (error) throw error;

      const followsMap = {};
      data.forEach(follow => {
        // Track who the current user is following
        if (follow.follower_id === user.id) {
          followsMap[follow.following_id] = true;
        }
      });
      setFollows(followsMap);
    } catch (error) {
      console.error('Error fetching follows:', error.message);
    }
  };

  const toggleFollow = async (userId) => {
    const isFollowing = follows[userId];

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert([{ follower_id: user.id, following_id: userId }]);

        if (error) throw error;
      }

      fetchFollows();
    } catch (error) {
      alert(error.message);
    }
  };

  const togglePostMenu = (postId) => {
    setShowPostMenu({
      ...showPostMenu,
      [postId]: !showPostMenu[postId]
    });
  };

  const handleShare = async (postId) => {
    const url = `${window.location.origin}/post/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
      setShowPostMenu({ ...showPostMenu, [postId]: false });
    } catch (error) {
      alert('Failed to copy link');
    }
  };

  const handleReport = (postId) => {
    alert('Report functionality coming soon!');
    setShowPostMenu({ ...showPostMenu, [postId]: false });
  };

  const handleCreateBlog = async (blogData) => {
    try {
      const { error } = await supabase
        .from('posts')
        .insert([
          {
            user_id: user.id,
            post_type: 'blog',
            title: blogData.title,
            blocks: blogData.blocks,
            country: blogData.country,
            duration: blogData.duration,
            trip_type: blogData.tripType,
            hashtags: blogData.hashtags,
            content: '', // Empty content for blog posts
          },
        ])
        .select();

      if (error) throw error;
      setShowBlogEditor(false);
      fetchPosts();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleViewPost = (post) => {
    setViewingPost(post);
  };

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

  const fetchAllComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const commentsMap = {};
      data.forEach(comment => {
        if (!commentsMap[comment.post_id]) {
          commentsMap[comment.post_id] = [];
        }
        commentsMap[comment.post_id].push(comment);
      });
      setComments(commentsMap);
    } catch (error) {
      console.error('Error fetching comments:', error.message);
    }
  };

  const toggleLike = async (postId) => {
    const isLiked = likes[postId]?.userLiked;

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
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

  const addComment = async (postId) => {
    const content = newComment[postId];
    if (!content || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert([{
          post_id: postId,
          user_id: user.id,
          content: content.trim()
        }]);

      if (error) throw error;

      setNewComment({ ...newComment, [postId]: '' });
      fetchAllComments();
    } catch (error) {
      alert(error.message);
    }
  };

  const deleteComment = async (commentId, postId) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      fetchAllComments();
    } catch (error) {
      alert(error.message);
    }
  };

  const toggleComments = (postId) => {
    setShowingComments({
      ...showingComments,
      [postId]: !showingComments[postId]
    });
    if (!showingComments[postId] && !comments[postId]) {
      fetchAllComments();
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

  // Get unique values for filters
  const uniqueCountries = [...new Set(posts.filter(p => p.country).map(p => p.country))].sort();
  const uniqueDurations = [...new Set(posts.filter(p => p.duration).map(p => p.duration))].sort();
  const uniqueHolidayTypes = [...new Set(posts.filter(p => p.trip_type).map(p => p.trip_type))].sort();

  if (showProfile) {
    return <Profile user={user} onBack={() => setShowProfile(false)} />;
  }

  const styles = {
    container: {
      maxWidth: '680px',
      margin: '0 auto',
      padding: '1.5rem 1rem',
      minHeight: '100vh',
      background: colors.background,
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem',
      padding: '1.25rem 1.5rem',
      background: colors.cardBackground,
      borderRadius: '12px',
      boxShadow: `0 2px 12px ${colors.shadow}`,
      color: colors.text,
      border: `1px solid ${colors.border}`,
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
      padding: '0.5rem 0.875rem',
      background: colors.navy,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      marginRight: '0.5rem',
      fontSize: '1rem',
      transition: 'all 0.2s ease',
    },
    notificationsButton: {
      padding: '0.5rem 0.875rem',
      background: colors.pink,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      marginRight: '0.5rem',
      position: 'relative',
      fontSize: '1rem',
      transition: 'all 0.2s ease',
    },
    notificationBadge: {
      position: 'absolute',
      top: '-6px',
      right: '-6px',
      background: colors.danger,
      color: '#fff',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.7rem',
      fontWeight: 'bold',
      border: '2px solid white',
    },
    profileButton: {
      padding: '0.5rem 0.875rem',
      background: colors.navy,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      marginRight: '0.5rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    signOutButton: {
      padding: '0.5rem 0.875rem',
      background: colors.textSecondary,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    searchBar: {
      background: colors.cardBackground,
      padding: '1rem',
      borderRadius: '12px',
      boxShadow: `0 2px 8px ${colors.shadow}`,
      marginBottom: '1.5rem',
      border: `1px solid ${colors.border}`,
    },
    searchInput: {
      width: '100%',
      padding: '0.75rem 1rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.95rem',
      background: colors.background,
      color: colors.text,
      boxSizing: 'border-box',
      fontFamily: 'inherit',
      transition: 'all 0.2s ease',
      outline: 'none',
      marginBottom: '0.75rem',
    },
    filterChips: {
      display: 'flex',
      gap: '0.75rem',
      flexWrap: 'wrap',
    },
    filterChip: {
      padding: '0.5rem 1rem',
      background: colors.background,
      border: `1.5px solid ${colors.border}`,
      borderRadius: '20px',
      fontSize: '0.85rem',
      fontWeight: '600',
      color: colors.text,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none',
      fontFamily: 'inherit',
    },
    filterChipActive: {
      padding: '0.5rem 1rem',
      background: colors.pink,
      border: `1.5px solid ${colors.pink}`,
      borderRadius: '20px',
      fontSize: '0.85rem',
      fontWeight: '600',
      color: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none',
      fontFamily: 'inherit',
    },
    createPost: {
      background: colors.cardBackground,
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: `0 2px 12px ${colors.shadow}`,
      marginBottom: '1.5rem',
      border: `1px solid ${colors.border}`,
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    textarea: {
      padding: '0.875rem 1rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '10px',
      fontSize: '0.95rem',
      fontFamily: 'inherit',
      resize: 'vertical',
      background: colors.background,
      color: colors.text,
      transition: 'all 0.2s ease',
      outline: 'none',
      lineHeight: '1.6',
    },
    postFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '0.75rem',
    },
    charCounter: {
      fontSize: '0.85rem',
      color: colors.textSecondary,
      fontWeight: '500',
    },
    postButton: {
      padding: '0.75rem 1.75rem',
      background: colors.pink,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.95rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    posts: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    post: {
      background: colors.cardBackground,
      padding: '1.5rem',
      borderRadius: '12px',
      boxShadow: `0 2px 8px ${colors.shadow}`,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      transition: 'all 0.2s ease',
      overflow: 'hidden',
    },
    postHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '0.5rem',
      fontSize: '0.9rem',
      alignItems: 'center',
    },
    postHeaderLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    followButton: {
      padding: '0.35rem 0.75rem',
      background: colors.pink,
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '0.8rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    followingButton: {
      padding: '0.35rem 0.75rem',
      background: colors.navy,
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '0.8rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
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
      flexWrap: 'wrap',
    },
    likeButton: {
      padding: '0.5rem 0.875rem',
      background: colors.background,
      color: colors.text,
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.875rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    likeButtonActive: {
      padding: '0.5rem 0.875rem',
      background: colors.pink,
      color: 'white',
      border: `1.5px solid transparent`,
      borderRadius: '8px',
      fontSize: '0.875rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.4rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    commentButton: {
      padding: '0.5rem 0.875rem',
      background: colors.background,
      color: colors.text,
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    editButton: {
      padding: '0.5rem 0.875rem',
      background: colors.success,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    deleteButton: {
      padding: '0.5rem 0.875rem',
      background: colors.danger,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    commentsSection: {
      marginTop: '1.25rem',
      paddingTop: '1.25rem',
      borderTop: `1.5px solid ${colors.border}`,
    },
    comment: {
      padding: '0.875rem 1rem',
      marginBottom: '0.625rem',
      background: colors.background,
      borderRadius: '10px',
      border: `1px solid ${colors.border}`,
    },
    commentHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '0.25rem',
      fontSize: '0.85rem',
    },
    commentContent: {
      margin: 0,
      fontSize: '0.9rem',
      color: colors.text,
    },
    commentInput: {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '0.75rem',
    },
    commentTextarea: {
      flex: 1,
      padding: '0.75rem 1rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      fontSize: '0.875rem',
      background: colors.background,
      color: colors.text,
      fontFamily: 'inherit',
      resize: 'vertical',
      transition: 'all 0.2s ease',
      outline: 'none',
    },
    commentSubmitButton: {
      padding: '0.75rem 1.125rem',
      background: colors.pink,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    deleteCommentButton: {
      padding: '0.3rem 0.625rem',
      background: colors.danger,
      color: '#fff',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.75rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
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
      padding: '0.625rem 1.125rem',
      background: colors.textSecondary,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    saveButton: {
      padding: '0.625rem 1.125rem',
      background: colors.pink,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    emptyMessage: {
      textAlign: 'center',
      color: colors.textSecondary,
      padding: '2rem',
    },
    postMenuButton: {
      padding: '0.5rem',
      background: 'transparent',
      color: colors.text,
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      transition: 'all 0.2s ease',
      position: 'relative',
    },
    postMenuDropdown: {
      position: 'absolute',
      top: '100%',
      right: 0,
      background: colors.cardBackground,
      border: `1.5px solid ${colors.border}`,
      borderRadius: '8px',
      boxShadow: `0 4px 12px ${colors.shadow}`,
      zIndex: 100,
      minWidth: '150px',
      marginTop: '0.25rem',
      overflow: 'hidden',
    },
    postMenuItem: {
      display: 'block',
      width: '100%',
      padding: '0.75rem 1rem',
      background: colors.cardBackground,
      color: colors.text,
      border: 'none',
      textAlign: 'left',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
      borderBottom: `1px solid ${colors.border}`,
    },
    postMenuItemDanger: {
      display: 'block',
      width: '100%',
      padding: '0.75rem 1rem',
      background: colors.cardBackground,
      color: colors.danger,
      border: 'none',
      textAlign: 'left',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    blogPreview: {
      position: 'relative',
      marginBottom: '0',
      marginTop: 'calc(-1.5rem - 1px)',
      marginLeft: 'calc(-1.5rem - 1px)',
      marginRight: 'calc(-1.5rem - 1px)',
      width: 'calc(100% + 3rem + 2px)',
    },
    blogImageContainer: {
      position: 'relative',
      marginBottom: '1.5rem',
      width: '100%',
      overflow: 'hidden',
      lineHeight: 0,
      fontSize: 0,
    },
    blogImage: {
      width: '100%',
      height: '300px',
      objectFit: 'cover',
      display: 'block',
      margin: 0,
      padding: 0,
      verticalAlign: 'top',
    },
    categoryTag: {
      position: 'absolute',
      top: '1rem',
      left: '1.5rem',
      background: 'rgba(255, 248, 240, 0.95)',
      color: '#d97706',
      padding: '1rem 1.5rem',
      borderRadius: '24px',
      fontSize: '0.95rem',
      fontWeight: '600',
      textTransform: 'lowercase',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    blogContentWrapper: {
      display: 'flex',
      gap: '1.5rem',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingLeft: '1.5rem',
      paddingRight: '1.5rem',
    },
    blogLeftSection: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
    },
    blogRightSection: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      minHeight: '100%',
    },
    blogUserSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '0.5rem',
    },
    userAvatar: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: colors.pink,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '700',
      fontSize: '0.9rem',
    },
    blogUsername: {
      fontWeight: '600',
      fontSize: '0.95rem',
      color: colors.text,
    },
    blogDate: {
      fontSize: '0.8rem',
      color: colors.textSecondary,
      marginTop: '0.15rem',
      textAlign: 'left',
    },
    blogTitle: {
      fontSize: '1.5rem',
      fontWeight: '700',
      margin: 0,
      color: colors.text,
      textAlign: 'left',
    },
    blogMetadata: {
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap',
    },
    blogHashtags: {
      display: 'flex',
      gap: '0.5rem',
      flexWrap: 'wrap',
    },
    metadataChip: {
      padding: '0.375rem 0.75rem',
      background: colors.background,
      border: `1px solid ${colors.border}`,
      borderRadius: '16px',
      fontSize: '0.8rem',
      fontWeight: '600',
      color: colors.text,
    },
    seeMoreLink: {
      color: 'white',
      fontSize: '1.5rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      background: colors.pink,
      border: 'none',
      width: '3.5rem',
      height: '3.5rem',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    blogActionsHorizontal: {
      display: 'flex',
      flexDirection: 'row',
      gap: '0.5rem',
    },
    seeMoreButton: {
      padding: '0.625rem 1.25rem',
      background: colors.pink,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      marginTop: '0.5rem',
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '1rem',
    },
    modalContent: {
      background: colors.cardBackground,
      borderRadius: '12px',
      maxWidth: '900px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      position: 'relative',
      boxShadow: `0 8px 32px ${colors.shadow}`,
      color: colors.text,
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1.5rem',
      borderBottom: `1px solid ${colors.border}`,
      position: 'sticky',
      top: 0,
      background: colors.cardBackground,
      zIndex: 1,
    },
    closeButton: {
      background: 'transparent',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: colors.text,
      padding: '0.5rem',
      lineHeight: 1,
    },
    modalBody: {
      padding: '1.5rem',
    },
  };

  return (
    <div style={styles.container}>
      {showNotifications && (
        <Notifications
          user={user}
          onClose={() => {
            setShowNotifications(false);
            fetchUnreadNotifications();
          }}
        />
      )}

      <div style={styles.header}>
        <h1>Social Feed</h1>
        <div style={styles.headerButtons}>
          <span style={styles.userEmail}>{user.email}</span>
          <button onClick={toggleDarkMode} style={styles.themeToggle}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setShowNotifications(true)} style={styles.notificationsButton}>
            🔔
            {unreadNotifications > 0 && (
              <span style={styles.notificationBadge}>{unreadNotifications}</span>
            )}
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
        <div style={styles.filterChips}>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            style={countryFilter ? styles.filterChipActive : styles.filterChip}
          >
            <option value="">All Countries</option>
            {uniqueCountries.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          <select
            value={durationFilter}
            onChange={(e) => setDurationFilter(e.target.value)}
            style={durationFilter ? styles.filterChipActive : styles.filterChip}
          >
            <option value="">All Durations</option>
            {uniqueDurations.map(duration => (
              <option key={duration} value={duration}>{duration}</option>
            ))}
          </select>
          <select
            value={holidayTypeFilter}
            onChange={(e) => setHolidayTypeFilter(e.target.value)}
            style={holidayTypeFilter ? styles.filterChipActive : styles.filterChip}
          >
            <option value="">All Holiday Types</option>
            {uniqueHolidayTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
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
            <div style={{ display: 'flex', gap: '0.5rem' }}>
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
              <button
                type="button"
                onClick={() => setShowBlogEditor(true)}
                style={{...styles.postButton, background: colors.navy}}
              >
                Create Blog Post
              </button>
            </div>
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
              {!(post.post_type === 'blog' || post.title) && (
                <div style={styles.postHeader}>
                  <div style={styles.postHeaderLeft}>
                    <strong>User {post.user_id.substring(0, 8)}</strong>
                    {post.user_id !== user.id && (
                      <button
                        onClick={() => toggleFollow(post.user_id)}
                        style={follows[post.user_id] ? styles.followingButton : styles.followButton}
                      >
                        {follows[post.user_id] ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                  <span style={styles.postDate}>{getRelativeTime(post.created_at)}</span>
                </div>
              )}

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
                  {post.post_type === 'blog' || post.title ? (
                    <div style={styles.blogPreview}>
                      {post.blocks && post.blocks[0] && post.blocks[0].type === 'image' && (
                        <div style={styles.blogImageContainer}>
                          <img
                            src={post.blocks[0].settings?.url || post.blocks[0].url}
                            alt={post.blocks[0].settings?.alt || post.blocks[0].alt || 'Blog image'}
                            style={styles.blogImage}
                          />
                          {post.trip_type && (
                            <div style={styles.categoryTag}>
                              {post.trip_type.toLowerCase()}
                            </div>
                          )}
                          <div style={{ position: 'absolute', top: '1rem', right: '1.5rem' }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePostMenu(post.id); }}
                              style={{...styles.postMenuButton, background: 'rgba(255, 255, 255, 0.9)', color: '#333'}}
                            >
                              ⋯
                            </button>
                            {showPostMenu[post.id] && (
                              <div style={styles.postMenuDropdown}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleShare(post.id); }}
                                  style={styles.postMenuItem}
                                >
                                  🔗 Share
                                </button>
                                {post.user_id === user.id && (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); alert('Edit blog post coming soon!'); setShowPostMenu({ ...showPostMenu, [post.id]: false }); }}
                                      style={styles.postMenuItem}
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deletePost(post.id); }}
                                      style={styles.postMenuItemDanger}
                                    >
                                      🗑️ Delete
                                    </button>
                                  </>
                                )}
                                {post.user_id !== user.id && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleReport(post.id); }}
                                    style={styles.postMenuItemDanger}
                                  >
                                    ⚠️ Report
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div style={styles.blogContentWrapper}>
                        <div style={styles.blogLeftSection}>
                          <div style={styles.blogUserSection}>
                            <div style={styles.userAvatar}>
                              {post.user_id.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={styles.blogUsername}>
                                User {post.user_id.substring(0, 8)}
                              </div>
                              <div style={styles.blogDate}>
                                {new Date(post.created_at).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                }).replace(/\//g, '/')}
                              </div>
                            </div>
                          </div>
                          <h2 style={styles.blogTitle}>{post.title}</h2>
                          <div style={styles.blogMetadata}>
                            {post.country && (
                              <span style={styles.metadataChip}>📍 {post.country}</span>
                            )}
                            {post.duration && (
                              <span style={styles.metadataChip}>⏱️ {post.duration}</span>
                            )}
                          </div>
                        </div>
                        <div style={styles.blogRightSection}>
                          {!(post.blocks && post.blocks[0] && post.blocks[0].type === 'image') && (
                            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); togglePostMenu(post.id); }}
                                style={styles.postMenuButton}
                              >
                                ⋯
                              </button>
                              {showPostMenu[post.id] && (
                                <div style={styles.postMenuDropdown}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleShare(post.id); }}
                                    style={styles.postMenuItem}
                                  >
                                    🔗 Share
                                  </button>
                                  {post.user_id === user.id && (
                                    <>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); alert('Edit blog post coming soon!'); setShowPostMenu({ ...showPostMenu, [post.id]: false }); }}
                                        style={styles.postMenuItem}
                                      >
                                        ✏️ Edit
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); deletePost(post.id); }}
                                        style={styles.postMenuItemDanger}
                                      >
                                        🗑️ Delete
                                      </button>
                                    </>
                                  )}
                                  {post.user_id !== user.id && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleReport(post.id); }}
                                      style={styles.postMenuItemDanger}
                                    >
                                      ⚠️ Report
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          <div style={styles.blogActionsHorizontal}>
                            <button
                              onClick={() => toggleLike(post.id)}
                              style={likes[post.id]?.userLiked ? styles.likeButtonActive : styles.likeButton}
                            >
                              {likes[post.id]?.userLiked ? '❤️' : '🤍'} {likes[post.id]?.count || 0}
                            </button>
                            <button onClick={() => toggleComments(post.id)} style={styles.commentButton}>
                              💬 {comments[post.id]?.length || 0}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '1.5rem', paddingRight: '1.5rem'}}>
                        <div style={styles.blogHashtags}>
                          {post.hashtags && post.hashtags.split(' ').filter(tag => tag.trim()).map((tag, index) => (
                            <span key={index} style={styles.metadataChip}>
                              {tag.startsWith('#') ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => handleViewPost(post)}
                          style={styles.seeMoreLink}
                        >
                          →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={styles.postContent}>{post.content}</p>
                  )}
                  {!(post.post_type === 'blog' || post.title) && (
                    <div style={styles.postActions}>
                      <button
                        onClick={() => toggleLike(post.id)}
                        style={likes[post.id]?.userLiked ? styles.likeButtonActive : styles.likeButton}
                      >
                        {likes[post.id]?.userLiked ? '❤️' : '🤍'} {likes[post.id]?.count || 0}
                      </button>
                      <button onClick={() => toggleComments(post.id)} style={styles.commentButton}>
                        💬 {comments[post.id]?.length || 0}
                      </button>
                      <div style={{ marginLeft: 'auto', position: 'relative' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePostMenu(post.id); }}
                          style={styles.postMenuButton}
                        >
                          ⋯
                        </button>
                        {showPostMenu[post.id] && (
                          <div style={styles.postMenuDropdown}>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleShare(post.id); }}
                              style={styles.postMenuItem}
                            >
                              🔗 Share
                            </button>
                            {post.user_id === user.id && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); startEdit(post); setShowPostMenu({ ...showPostMenu, [post.id]: false }); }}
                                  style={styles.postMenuItem}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); deletePost(post.id); }}
                                  style={styles.postMenuItemDanger}
                                >
                                  🗑️ Delete
                                </button>
                              </>
                            )}
                            {post.user_id !== user.id && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReport(post.id); }}
                                style={styles.postMenuItemDanger}
                              >
                                ⚠️ Report
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {showingComments[post.id] && (
                    <div style={styles.commentsSection}>
                      {comments[post.id]?.map((comment) => (
                        <div key={comment.id} style={styles.comment}>
                          <div style={styles.commentHeader}>
                            <strong>User {comment.user_id.substring(0, 8)}</strong>
                            <div>
                              <span style={{ color: colors.textSecondary, fontSize: '0.75rem', marginRight: '0.5rem' }}>
                                {getRelativeTime(comment.created_at)}
                              </span>
                              {comment.user_id === user.id && (
                                <button
                                  onClick={() => deleteComment(comment.id, post.id)}
                                  style={styles.deleteCommentButton}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>
                          <p style={styles.commentContent}>{comment.content}</p>
                        </div>
                      ))}
                      <div style={styles.commentInput}>
                        <textarea
                          placeholder="Add a comment..."
                          value={newComment[post.id] || ''}
                          onChange={(e) =>
                            setNewComment({ ...newComment, [post.id]: e.target.value })
                          }
                          style={styles.commentTextarea}
                          rows="2"
                        />
                        <button
                          onClick={() => addComment(post.id)}
                          style={styles.commentSubmitButton}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>

      {showBlogEditor && (
        <PostEditor onSave={handleCreateBlog} onClose={() => setShowBlogEditor(false)} />
      )}

      {viewingPost && (
        <div style={styles.modalOverlay} onClick={() => setViewingPost(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.postHeaderLeft}>
                  <strong>User {viewingPost.user_id.substring(0, 8)}</strong>
                </div>
                <span style={styles.postDate}>{getRelativeTime(viewingPost.created_at)}</span>
              </div>
              <button onClick={() => setViewingPost(null)} style={styles.closeButton}>
                &times;
              </button>
            </div>
            <div style={styles.modalBody}>
              <PostRenderer post={viewingPost} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Feed;
