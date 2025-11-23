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
      backgroundColor: colors.cardBackground,
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      color: colors.text,
    },
    backButton: {
      padding: '0.5rem 1rem',
      backgroundColor: colors.textSecondary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    profileCard: {
      backgroundColor: colors.cardBackground,
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      color: colors.text,
    },
    avatar: {
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      backgroundColor: colors.primary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2rem',
      color: '#fff',
      margin: '0 auto 1rem',
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
      padding: '0.75rem 1.5rem',
      backgroundColor: colors.primary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    },
    label: {
      fontWeight: 'bold',
      marginBottom: '0.25rem',
    },
    input: {
      padding: '0.75rem',
      border: `1px solid ${colors.border}`,
      borderRadius: '4px',
      fontSize: '1rem',
      backgroundColor: colors.background,
      color: colors.text,
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
    buttons: {
      display: 'flex',
      gap: '0.5rem',
      justifyContent: 'center',
    },
    cancelButton: {
      padding: '0.75rem 1.5rem',
      backgroundColor: colors.textSecondary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
    },
    saveButton: {
      padding: '0.75rem 1.5rem',
      backgroundColor: colors.primary,
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
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
