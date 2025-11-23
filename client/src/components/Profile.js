import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme } from '../ThemeContext';

function Profile({ user, onBack }) {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    fetchProfile();
  }, [user.id]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setUsername(data.username || '');
      setBio(data.bio || '');
    } catch (error) {
      console.error('Error fetching profile:', error.message);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      setEditing(false);
      fetchProfile();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

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
    backButton: {
      padding: '0.625rem 1.125rem',
      background: colors.navy,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    profileCard: {
      background: colors.cardBackground,
      padding: '2.5rem 2rem',
      borderRadius: '16px',
      boxShadow: `0 2px 12px ${colors.shadow}`,
      color: colors.text,
      border: `1px solid ${colors.border}`,
    },
    avatar: {
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      background: colors.pink,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2.25rem',
      color: '#fff',
      margin: '0 auto 1.5rem',
      border: '3px solid white',
      boxShadow: `0 4px 12px ${colors.shadow}`,
    },
    username: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: '0.5rem',
    },
    email: {
      textAlign: 'center',
      color: colors.textSecondary,
      marginBottom: '1rem',
    },
    bio: {
      textAlign: 'center',
      marginBottom: '1.5rem',
      fontStyle: profile?.bio ? 'normal' : 'italic',
      color: profile?.bio ? colors.text : colors.textSecondary,
    },
    editButton: {
      display: 'block',
      margin: '0 auto',
      padding: '0.75rem 1.75rem',
      background: colors.pink,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.95rem',
      transition: 'all 0.2s ease',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      marginTop: '1rem',
    },
    label: {
      fontWeight: 'bold',
      marginBottom: '0.5rem',
      display: 'block',
      color: colors.text,
    },
    input: {
      padding: '0.875rem 1.125rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '10px',
      fontSize: '0.95rem',
      background: colors.background,
      color: colors.text,
      fontFamily: 'inherit',
      width: '100%',
      boxSizing: 'border-box',
      transition: 'all 0.2s ease',
      outline: 'none',
    },
    textarea: {
      padding: '0.875rem 1.125rem',
      border: `1.5px solid ${colors.border}`,
      borderRadius: '10px',
      fontSize: '0.95rem',
      fontFamily: 'inherit',
      resize: 'vertical',
      background: colors.background,
      color: colors.text,
      width: '100%',
      boxSizing: 'border-box',
      transition: 'all 0.2s ease',
      outline: 'none',
      lineHeight: '1.6',
    },
    buttons: {
      display: 'flex',
      gap: '0.75rem',
      justifyContent: 'center',
      marginTop: '0.5rem',
    },
    cancelButton: {
      padding: '0.75rem 1.5rem',
      background: colors.textSecondary,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.95rem',
      transition: 'all 0.2s ease',
    },
    saveButton: {
      padding: '0.75rem 1.5rem',
      background: colors.pink,
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '0.95rem',
      transition: 'all 0.2s ease',
    },
  };

  if (!profile) {
    return <div style={{ color: colors.text }}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Profile</h1>
        <button onClick={onBack} style={styles.backButton}>
          Back to Feed
        </button>
      </div>

      <div style={styles.profileCard}>
        <div style={styles.avatar}>
          {username ? username.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
        </div>

        {editing ? (
          <form onSubmit={updateProfile} style={styles.form}>
            <div>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={styles.input}
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label style={styles.label}>Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={styles.textarea}
                rows="4"
                placeholder="Tell us about yourself..."
                maxLength="200"
              />
              <small style={{ color: colors.textSecondary }}>
                {200 - bio.length} characters remaining
              </small>
            </div>
            <div style={styles.buttons}>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setUsername(profile.username || '');
                  setBio(profile.bio || '');
                }}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} style={styles.saveButton}>
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div style={styles.username}>{username || 'No username set'}</div>
            <div style={styles.email}>{user.email}</div>
            <div style={styles.bio}>{bio || 'No bio yet'}</div>
            <button onClick={() => setEditing(true)} style={styles.editButton}>
              Edit Profile
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Profile;
