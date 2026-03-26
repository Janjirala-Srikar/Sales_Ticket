import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useMutation } from '@tanstack/react-query';
import './AuthPage.css';
import { useAuth } from '../../context/AuthContext';

/* ─── Eye maths ─────────────────────────────────────────── */
function getPupilOffset(eyeCx, eyeCy, svgEl, mouseX, mouseY, maxOffset = 3) {
  if (!svgEl) return { dx: 0, dy: 0 };
  const rect = svgEl.getBoundingClientRect();
  const scaleX = rect.width / 611;
  const scaleY = rect.height / 334;
  const eyeScreenX = eyeCx * scaleX + rect.left;
  const eyeScreenY = eyeCy * scaleY + rect.top;
  const dx = mouseX - eyeScreenX;
  const dy = mouseY - eyeScreenY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const clamped = Math.min(dist, 60);
  const ratio = (clamped / 60) * maxOffset;
  return { dx: (dx / dist) * ratio, dy: (dy / dist) * ratio };
}

/* ─── Penguin SVG background ────────────────────────────── */
function PenguinBg({ mouseX, mouseY, hasError, isLoading }) {
  const svgRef = useRef(null);

  const eyes = [
    // [eyeGroup, cx, cy, rx, ry, maxOffset]
    { id: 'p1r', cx: 91, cy: 224, rx: 3, ry: 5, max: 2 },
    { id: 'p1l', cx: 67, cy: 224, rx: 3, ry: 5, max: 2 },
    { id: 'p2r', cx: 165, cy: 264, rx: 3, ry: 5, max: 2 },
    { id: 'p2l', cx: 141, cy: 264, rx: 3, ry: 5, max: 2 },
    { id: 'p3r', cx: 236, cy: 288, rx: 3, ry: 5, max: 2 },
    { id: 'p3l', cx: 214, cy: 288, rx: 3, ry: 5, max: 2 },
    { id: 'p4r', cx: 333.38, cy: 297, rx: 4.38, ry: 5, max: 3 },
    { id: 'p4l', cx: 298.5, cy: 297, rx: 4.5, ry: 5, max: 3 },
    { id: 'p5r', cx: 390, cy: 273, rx: 3, ry: 5, max: 2 },
    { id: 'p5l', cx: 414, cy: 272, rx: 3, ry: 5, max: 2 },
    { id: 'p6r', cx: 492, cy: 273, rx: 3, ry: 5, max: 2 },
    { id: 'p6l', cx: 469, cy: 273, rx: 3, ry: 5, max: 2 },
    { id: 'p7r', cx: 569, cy: 229, rx: 3, ry: 5, max: 2 },
    { id: 'p7l', cx: 546, cy: 229, rx: 3, ry: 5, max: 2 },
  ];

  const offsets = eyes.map(e => ({
    ...e,
    ...getPupilOffset(e.cx, e.cy, svgRef.current, mouseX, mouseY, e.max),
  }));

  /* Error face: X eyes on center penguin, worried brows elsewhere */
  const errorMode = hasError && !isLoading;

  return (
    <div className="auth-bg">
      <svg
        ref={svgRef}
        viewBox="0 0 611 334"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Background */}
        <rect width="611" height="334" fill="#F0F7FF" />

        {/* ── Penguin 1 (left, #185FA5) ── */}
        <path d="M52 207C52 193.193 63.1929 182 77 182C90.8071 182 102 193.193 102 207V436H52V207Z" fill="#185FA5" />
        <ellipse cx="89.5" cy="226" rx="6.5" ry="11" fill="#F8FAFC" />
        <ellipse cx={offsets[0].cx + offsets[0].dx} cy={offsets[0].cy + offsets[0].dy} rx="3" ry="5" fill="#042C53" />
        <ellipse cx={offsets[0].cx + offsets[0].dx + 1} cy={offsets[0].cy + offsets[0].dy - 1.5} rx="1" ry="1.5" fill="#BFDBFE" />
        <ellipse cx="65.5" cy="227" rx="6.5" ry="11" fill="#F8FAFC" />
        <ellipse cx={offsets[1].cx + offsets[1].dx} cy={offsets[1].cy + offsets[1].dy} rx="3" ry="5" fill="#042C53" />
        <ellipse cx={offsets[1].cx + offsets[1].dx + 1} cy={offsets[1].cy + offsets[1].dy - 1.5} rx="1" ry="1.5" fill="#BFDBFE" />
        {/* beak */}
        <path d="M78.4991 281.111L72.208 267.515L85.1969 267.71L78.4991 281.111Z" fill="#CBD5E1" />
        <path d="M78.5 266L85.8612 340.25H71.1388L78.5 266Z" fill="#CBD5E1" />
        {/* error brow */}
        {errorMode && <line x1="62" y1="218" x2="72" y2="221" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />}
        {errorMode && <line x1="83" y1="218" x2="93" y2="221" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />}

        {/* ── Penguin 2 (#378ADD) ── */}
        <path d="M120 267C120 249.327 134.327 235 152 235C169.673 235 184 249.327 184 267V415H120V267Z" fill="#378ADD" />
        <ellipse cx="163.5" cy="266" rx="6.5" ry="11" fill="#F8FAFC" />
        <ellipse cx={offsets[2].cx + offsets[2].dx} cy={offsets[2].cy + offsets[2].dy} rx="3" ry="5" fill="#042C53" />
        <ellipse cx={offsets[2].cx + offsets[2].dx + 1} cy={offsets[2].cy + offsets[2].dy - 1.5} rx="1" ry="1.5" fill="#BFDBFE" />
        <ellipse cx="139.5" cy="267" rx="6.5" ry="11" fill="#F8FAFC" />
        <ellipse cx={offsets[3].cx + offsets[3].dx} cy={offsets[3].cy + offsets[3].dy} rx="3" ry="5" fill="#042C53" />
        <ellipse cx={offsets[3].cx + offsets[3].dx + 1} cy={offsets[3].cy + offsets[3].dy - 1.5} rx="1" ry="1.5" fill="#BFDBFE" />
        {errorMode && <line x1="136" y1="258" x2="146" y2="261" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />}
        {errorMode && <line x1="158" y1="257" x2="168" y2="260" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />}

        {/* ── Penguin 3 (#185FA5) ── */}
        <path d="M200 289C200 275.193 211.193 264 225 264C238.807 264 250 275.193 250 289V518H200V289Z" fill="#185FA5" />
        <ellipse cx="236.5" cy="291" rx="6.5" ry="11" fill="#F8FAFC" />
        <ellipse cx={offsets[4].cx + offsets[4].dx} cy={offsets[4].cy + offsets[4].dy} rx="3" ry="5" fill="#042C53" />
        <ellipse cx={offsets[4].cx + offsets[4].dx + 1} cy={offsets[4].cy + offsets[4].dy - 1.5} rx="1" ry="1.5" fill="#BFDBFE" />
        <ellipse cx="214.5" cy="290" rx="6.5" ry="11" fill="#F8FAFC" />
        <ellipse cx={offsets[5].cx + offsets[5].dx} cy={offsets[5].cy + offsets[5].dy} rx="3" ry="5" fill="#042C53" />
        <ellipse cx={offsets[5].cx + offsets[5].dx + 1} cy={offsets[5].cy + offsets[5].dy - 1.5} rx="1" ry="1.5" fill="#BFDBFE" />
        {errorMode && <line x1="211" y1="281" x2="221" y2="284" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />}
        {errorMode && <line x1="232" y1="281" x2="242" y2="284" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />}

        {/* ── Center big penguin (#0C447C) — X eyes on error ── */}
        <path d="M278 296.5C278 276.342 294.342 260 314.5 260C334.658 260 351 276.342 351 296.5V514H278V296.5Z" fill="#0C447C" />
        {/* right eye socket */}
        <ellipse cx="333.75" cy="299" rx="9.49" ry="11" fill="#F8FAFC" />
        {!errorMode ? (
          <>
            <ellipse cx={offsets[6].cx + offsets[6].dx} cy={offsets[6].cy + offsets[6].dy} rx="4.38" ry="5" fill="#042C53" />
            <ellipse cx={offsets[6].cx + offsets[6].dx + 1.5} cy={offsets[6].cy + offsets[6].dy - 1.8} rx="1.46" ry="1.8" fill="#BFDBFE" />
          </>
        ) : (
          /* X eye right */
          <>
            <line x1="328" y1="294" x2="340" y2="304" stroke="#991B1B" strokeWidth="3" strokeLinecap="round" />
            <line x1="340" y1="294" x2="328" y2="304" stroke="#991B1B" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {/* left eye socket */}
        <ellipse cx="298.5" cy="300" rx="9.5" ry="11" fill="#F8FAFC" />
        {!errorMode ? (
          <>
            <ellipse cx={offsets[7].cx + offsets[7].dx} cy={offsets[7].cy + offsets[7].dy} rx="4.5" ry="5" fill="#042C53" />
            <ellipse cx={offsets[7].cx + offsets[7].dx + 1.5} cy={offsets[7].cy + offsets[7].dy - 1.8} rx="1.5" ry="1.8" fill="#BFDBFE" />
          </>
        ) : (
          /* X eye left */
          <>
            <line x1="292" y1="295" x2="305" y2="305" stroke="#991B1B" strokeWidth="3" strokeLinecap="round" />
            <line x1="305" y1="295" x2="292" y2="305" stroke="#991B1B" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {/* worried brow on error */}
        {errorMode && <line x1="290" y1="288" x2="306" y2="292" stroke="#991B1B" strokeWidth="2.5" strokeLinecap="round" />}
        {errorMode && <line x1="323" y1="287" x2="342" y2="291" stroke="#991B1B" strokeWidth="2.5" strokeLinecap="round" />}
        {/* sad mouth on error */}
        {errorMode && <path d="M304 316 Q314.5 310 325 316" stroke="#991B1B" strokeWidth="2" fill="none" strokeLinecap="round" />}

        {/* ── Penguin 5 (#185FA5) ── */}
        <path d="M379 271C379 257.193 390.193 246 404 246C417.807 246 429 257.193 429 271V500H379V271Z" fill="#185FA5" />
        <ellipse cx="390.5" cy="276" rx="6.5" ry="11" fill="#F8FAFC" />
        <ellipse cx={offsets[8].cx + offsets[8].dx} cy={offsets[8].cy + offsets[8].dy} rx="3" ry="5" fill="#042C53" />
        <ellipse cx={offsets[8].cx + offsets[8].dx + 1} cy={offsets[8].cy + offsets[8].dy - 1.5} rx="1" ry="1.5" fill="#BFDBFE" />
        <ellipse cx="414.5" cy="275" rx="6.5" ry="11" fill="#F8FAFC" />
        <ellipse cx={offsets[9].cx + offsets[9].dx} cy={offsets[9].cy + offsets[9].dy} rx="3" ry="5" fill="#042C53" />
        <ellipse cx={offsets[9].cx + offsets[9].dx + 1} cy={offsets[9].cy + offsets[9].dy - 1.5} rx="1" ry="1.5" fill="#BFDBFE" />
        {errorMode && <line x1="386" y1="267" x2="396" y2="270" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />}
        {errorMode && <line x1="408" y1="267" x2="418" y2="270" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />}

        {/* ── Penguin 6 (#378ADD) ── */}
        <path d="M451 276C451 258.327 465.327 244 483 244C500.673 244 515 258.327 515 276V424H451V276Z" fill="#378ADD" />
        <ellipse cx="494.5" cy="275" rx="6.5" ry="11" fill="#F8FAFC" />
        <ellipse cx={offsets[10].cx + offsets[10].dx} cy={offsets[10].cy + offsets[10].dy} rx="3" ry="5" fill="#042C53" />
        <ellipse cx={offsets[10].cx + offsets[10].dx + 1} cy={offsets[10].cy + offsets[10].dy - 1.5} rx="1" ry="1.5" fill="#BFDBFE" />
        <ellipse cx="470.5" cy="276" rx="6.5" ry="11" fill="#F8FAFC" />
        <ellipse cx={offsets[11].cx + offsets[11].dx} cy={offsets[11].cy + offsets[11].dy} rx="3" ry="5" fill="#042C53" />
        <ellipse cx={offsets[11].cx + offsets[11].dx + 1} cy={offsets[11].cy + offsets[11].dy - 1.5} rx="1" ry="1.5" fill="#BFDBFE" />
        {errorMode && <line x1="466" y1="267" x2="476" y2="270" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />}
        {errorMode && <line x1="488" y1="266" x2="498" y2="269" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />}

        {/* ── Penguin 7 (right, #0C447C) ── */}
        <path d="M534 212C534 198.193 545.193 187 559 187C572.807 187 584 198.193 584 212V441H534V212Z" fill="#0C447C" />
        <ellipse cx="571.5" cy="231" rx="6.5" ry="11" fill="#F8FAFC" />
        <ellipse cx={offsets[12].cx + offsets[12].dx} cy={offsets[12].cy + offsets[12].dy} rx="3" ry="5" fill="#042C53" />
        <ellipse cx={offsets[12].cx + offsets[12].dx + 1} cy={offsets[12].cy + offsets[12].dy - 1.5} rx="1" ry="1.5" fill="#BFDBFE" />
        <ellipse cx="547.5" cy="232" rx="6.5" ry="11" fill="#F8FAFC" />
        <ellipse cx={offsets[13].cx + offsets[13].dx} cy={offsets[13].cy + offsets[13].dy} rx="3" ry="5" fill="#042C53" />
        <ellipse cx={offsets[13].cx + offsets[13].dx + 1} cy={offsets[13].cy + offsets[13].dy - 1.5} rx="1" ry="1.5" fill="#BFDBFE" />
        <path d="M560.499 286.111L554.208 272.515L567.197 272.71L560.499 286.111Z" fill="#CBD5E1" />
        <path d="M560.5 271L567.861 345.25H553.139L560.5 271Z" fill="#CBD5E1" />
        {errorMode && <line x1="543" y1="222" x2="553" y2="225" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />}
        {errorMode && <line x1="566" y1="222" x2="576" y2="225" stroke="#991B1B" strokeWidth="2" strokeLinecap="round" />}

        {/* Snow ground */}
        <rect x="0" y="320" width="611" height="14" fill="#BFDBFE" rx="2" />
      </svg>
    </div>
  );
}

/* ─── Main AuthPage ─────────────────────────────────────── */
export default function AuthPage({ defaultMode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { API_BASE, login } = useAuth();

  const [mode, setMode] = useState(defaultMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passkey, setPasskey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mouse, setMouse] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const cardRef = useRef(null);

  useEffect(() => { setMode(defaultMode); }, [defaultMode]);

  useEffect(() => {
    if (location.state?.prefillEmail) {
      setEmail(location.state.prefillEmail);
      setMode('register');
    }
  }, [location.state]);

  /* Track cursor */
  useEffect(() => {
    const onMove = (e) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const headline = useMemo(() => {
    if (mode === 'login') return 'Root access login';
    if (mode === 'register') return 'Create your account';
    return 'Team access login';
  }, [mode]);

  const loginMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axios.post(`${API_BASE}/users/login`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      const token = data?.token;
      const profile = data?.user || {};
      const profileName = profile.name || profile.username || name;
      const profileEmail = profile.email || email;
      if (!token) { setError('Token missing from response'); return; }
      login(token, { ...profile, name: profileName, email: profileEmail, username: profileName });
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      const apiMessage = err.response?.data?.message;
      setError(apiMessage || err.message || 'Something went wrong');
      /* Shake the card */
      if (cardRef.current) {
        cardRef.current.classList.remove('penguin-error');
        void cardRef.current.offsetWidth;
        cardRef.current.classList.add('penguin-error');
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axios.post(`${API_BASE}/users/register`, payload);
      return res.data;
    },
    onSuccess: () => {
      setMessage('Account created. Signing you in...');
      loginMutation.mutate({ email, password });
    },
    onError: (err) => {
      const apiMessage = err.response?.data?.message;
      setError(apiMessage || err.message || 'Something went wrong');
      if (cardRef.current) {
        cardRef.current.classList.remove('penguin-error');
        void cardRef.current.offsetWidth;
        cardRef.current.classList.add('penguin-error');
      }
    },
  });

  const rootLoginMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axios.post(`${API_BASE}/users/role-login`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      const token = data?.token;
      const profile = data?.user || {};
      if (!token) { setError('Token missing from response'); return; }
      login(token, { ...profile, name: profile.name, email: profile.email, username: profile.name });
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      const apiMessage = err.response?.data?.message;
      setError(apiMessage || err.message || 'Something went wrong');
      if (cardRef.current) {
        cardRef.current.classList.remove('penguin-error');
        void cardRef.current.offsetWidth;
        cardRef.current.classList.add('penguin-error');
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (mode === 'register') {
      registerMutation.mutate({ name, email, password });
    } else if (mode === 'login') {
      loginMutation.mutate({ email, password });
    } else if (mode === 'rootLogin') {
      rootLoginMutation.mutate({ email, passkey });
    }
  };

  const loading = loginMutation.isPending || registerMutation.isPending || rootLoginMutation.isPending;

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
  };

  const tabs = [
    { key: 'login', label: 'Root Login' },
    { key: 'register', label: 'Register' },
    { key: 'rootLogin', label: 'Team Login' },
  ];

  return (
    <div className="auth-shell">
      <PenguinBg mouseX={mouse.x} mouseY={mouse.y} hasError={!!error} isLoading={loading} />

      <Link to="/" className="auth-logo" aria-label="TicketSignal home">
        <svg className="auth-logo-mark" xmlns="http://www.w3.org/2000/svg" width={32} height={32}>
          <path d="M31.956 14.8C31.372 6.92 25.08.628 17.2.044V5.76a9.04 9.04 0 0 0 9.04 9.04h5.716ZM14.8 26.24v5.716C6.92 31.372.63 25.08.044 17.2H5.76a9.04 9.04 0 0 1 9.04 9.04Zm11.44-9.04h5.716c-.584 7.88-6.876 14.172-14.756 14.756V26.24a9.04 9.04 0 0 1 9.04-9.04ZM.044 14.8C.63 6.92 6.92.628 14.8.044V5.76a9.04 9.04 0 0 1-9.04 9.04H.044Z" />
        </svg>
      </Link>

      <div className="auth-card" ref={cardRef}>
        <div className="auth-tabs auth-tabs--grid3">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchMode(t.key)}
              className={mode === t.key ? 'active' : ''}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="auth-header">
          <h2>{headline}</h2>
          <p>
            {mode === 'login' && 'Use your email and password to sign in with root access.'}
            {mode === 'register' && 'Start routing revenue signals to your team.'}
            {mode === 'rootLogin' && 'Use your passkey to log in with team access.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name" name="name" type="text" placeholder="Priya Sharma"
                value={name} onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Work email</label>
            <input
              id="email" name="email" type="email" placeholder="you@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          </div>

          {mode !== 'rootLogin' && (
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password" name="password" type="password" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                minLength={6} required
              />
            </div>
          )}

          {mode === 'rootLogin' && (
            <div className="field">
              <label htmlFor="passkey">Passkey</label>
              <input
                id="passkey" name="passkey" type="password" placeholder="Your role passkey"
                value={passkey} onChange={(e) => setPasskey(e.target.value)}
                required
              />
            </div>
          )}

          {error && <div className="auth-alert error">{error}</div>}
          {message && <div className="auth-alert success">{message}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Working...' : (mode === 'login' || mode === 'rootLogin') ? 'Sign in' : 'Register & Sign in'}
          </button>

          <div className="auth-switch">
            Need a different mode? Use the tabs above to switch between root login, team login, and registration.
          </div>
        </form>
      </div>
    </div>
  );
}
