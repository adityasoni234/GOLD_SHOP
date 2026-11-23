import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, requireAuth } from '../../firebase/firebase.js';

/**
 * Optional Firebase email/password sign-in.
 * Only active when Firebase is configured AND VITE_FIREBASE_REQUIRE_AUTH=true.
 */
export default function AuthGate({ children }) {
  const [user, setUser] = useState(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!requireAuth || !auth) return undefined;
    return onAuthStateChanged(auth, setUser);
  }, []);

  if (!requireAuth || !auth) return children;
  if (user === undefined) return <div className="empty" style={{ paddingTop: '30vh' }}>Checking sign-in…</div>;
  if (user) {
    return (
      <>
        {children}
        <button className="btn btn-sm" style={{ position: 'fixed', left: 12, bottom: 54, zIndex: 70 }} onClick={() => signOut(auth)}>
          Sign out
        </button>
      </>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.code === 'auth/invalid-credential' ? 'Incorrect email or password.' : err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form className="card card-body stack" style={{ width: 360 }} onSubmit={submit}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 30 }}>ABS Billing</h1>
        <p className="muted small">Sign in with your shop operator account.</p>
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <div className="field-error">{error}</div>}
        <button className="btn btn-primary btn-lg" type="submit">Sign in</button>
      </form>
    </div>
  );
}
