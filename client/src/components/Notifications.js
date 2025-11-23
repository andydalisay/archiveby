import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme } from '../ThemeContext';

function Notifications({ user, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const subscription = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user.id]);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error('Error marking as read:', error.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error.message);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error.message);
    }
  };

  const getNotificationText = (notification) => {
    const userId = notification.related_user_id?.substring(0, 8);
    switch (notification.type) {
      case 'like':
        return `User ${userId} liked your post`;
      case 'comment':
        return `User ${userId} commented on your post`;
      case 'follow':
        return `User ${userId} started following you`;
      default:
        return 'New notification';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like': return '❤️';
      case 'comment': return '💬';
      case 'follow': return '👤';
      default: return '🔔';
    }
  };

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const notifDate = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notifDate) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    }
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  };

  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modal: {
      backgroundColor: colors.cardBackground,
      borderRadius: '8px',
      maxWidth: '500px',
      width: '90%',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    },
    header: {
      padding: '1.5rem',
      borderBottom: `1px solid ${colors.border}`,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      margin: 0,
      color: colors.text,
      fontSize: '1.25rem',
    },
    headerButtons: {
      display: 'flex',
      gap: '0.5rem',
    },
    markAllButton: {
      padding: '0.5rem 1rem',
      backgroundColor: colors.primary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.85rem',
    },
    closeButton: {
      padding: '0.5rem 1rem',
      backgroundColor: colors.textSecondary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.85rem',
    },
    content: {
      flex: 1,
      overflowY: 'auto',
      padding: '1rem',
    },
    notification: {
      padding: '1rem',
      marginBottom: '0.5rem',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.75rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    notificationUnread: {
      backgroundColor: colors.background,
    },
    notificationRead: {
      backgroundColor: colors.cardBackground,
      opacity: 0.7,
    },
    icon: {
      fontSize: '1.5rem',
      flexShrink: 0,
    },
    notificationContent: {
      flex: 1,
    },
    notificationText: {
      color: colors.text,
      margin: 0,
      marginBottom: '0.25rem',
    },
    notificationTime: {
      color: colors.textSecondary,
      fontSize: '0.85rem',
    },
    deleteButton: {
      padding: '0.25rem 0.5rem',
      backgroundColor: colors.danger,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '0.75rem',
    },
    emptyMessage: {
      textAlign: 'center',
      color: colors.textSecondary,
      padding: '2rem',
    },
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </h2>
          <div style={styles.headerButtons}>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={styles.markAllButton}>
                Mark all read
              </button>
            )}
            <button onClick={onClose} style={styles.closeButton}>
              Close
            </button>
          </div>
        </div>
        <div style={styles.content}>
          {loading ? (
            <p style={styles.emptyMessage}>Loading...</p>
          ) : notifications.length === 0 ? (
            <p style={styles.emptyMessage}>No notifications yet</p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  ...styles.notification,
                  ...(notification.read ? styles.notificationRead : styles.notificationUnread),
                }}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div style={styles.icon}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div style={styles.notificationContent}>
                  <p style={styles.notificationText}>
                    {getNotificationText(notification)}
                  </p>
                  <span style={styles.notificationTime}>
                    {getRelativeTime(notification.created_at)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  style={styles.deleteButton}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Notifications;
