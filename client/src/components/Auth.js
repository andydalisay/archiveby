import { useState } from 'react';
import { supabase } from '../supabaseClient';

function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>{isSignUp ? 'Sign Up' : 'Sign In'}</h1>
        <form onSubmit={handleAuth} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        <p style={styles.toggle}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <span onClick={() => setIsSignUp(!isSignUp)} style={styles.link}>
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#f8f9fd',
    padding: '1rem',
  },
  card: {
    background: '#ffffff',
    padding: '3rem 2.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(30, 58, 95, 0.08)',
    width: '100%',
    maxWidth: '440px',
    border: '1px solid #e2e8f0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    marginTop: '2rem',
  },
  input: {
    padding: '0.875rem 1.125rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    color: '#1a2332',
    background: '#f8f9fd',
    transition: 'all 0.2s ease',
    outline: 'none',
  },
  button: {
    padding: '0.875rem 1.5rem',
    background: '#ffb3c1',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginTop: '0.5rem',
    boxShadow: '0 2px 8px rgba(255, 179, 193, 0.25)',
  },
  toggle: {
    marginTop: '2rem',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '0.9rem',
  },
  link: {
    color: '#ffb3c1',
    cursor: 'pointer',
    fontWeight: '600',
    textDecoration: 'none',
    transition: 'color 0.2s ease',
  },
};

export default Auth;
