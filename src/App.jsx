import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BUILTIN_EXERCISES, WARMUP_EXERCISES, COOLDOWN_EXERCISES } from './exercises';
import { auth, db } from './firebase';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc, deleteField, onSnapshot } from 'firebase/firestore';

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'BODYWEIGHT' },
  { id: 'dumbbell',   label: 'DUMBBELLS' },
  { id: 'kettlebell', label: 'KETTLEBELL' },
  { id: 'band',       label: 'RESISTANCE BAND' },
];

const EMOJI_REACTIONS = [
  { key: 'fire',   emoji: '🔥' },
  { key: 'muscle', emoji: '💪' },
  { key: 'clap',   emoji: '🙌' },
  { key: 'bolt',   emoji: '⚡' },
];

const TARGET_OPTIONS = [50, 75, 100];

const SCHEMES_BY_TARGET = {
  50: [
    { id: 'free',  label: 'FREE',        short: 'Free count',          sets: null },
    { id: '5x10',  label: '5 × 10',      short: 'Five by ten',         sets: [10,10,10,10,10] },
    { id: '2x25',  label: '2 × 25',      short: 'Two by twenty-five',  sets: [25,25] },
    { id: '10x5',  label: '10 × 5',      short: 'Death by fives',      sets: Array(10).fill(5) },
    { id: 'asc',   label: 'LADDER UP',   short: '5 → 20 ascending',    sets: [5,10,15,20] },
    { id: 'desc',  label: 'LADDER DOWN', short: '20 → 5 descending',   sets: [20,15,10,5] },
  ],
  75: [
    { id: 'free',    label: 'FREE',        short: 'Free count',         sets: null },
    { id: '5x15',    label: '5 × 15',      short: 'Five by fifteen',    sets: [15,15,15,15,15] },
    { id: '3x25',    label: '3 × 25',      short: 'Three by twenty-five', sets: [25,25,25] },
    { id: '15x5',    label: '15 × 5',      short: 'Death by fives',     sets: Array(15).fill(5) },
    { id: 'asc',     label: 'LADDER UP',   short: '15 → 25 ascending',  sets: [15,15,20,25] },
    { id: 'desc',    label: 'LADDER DOWN', short: '25 → 15 descending', sets: [25,20,15,15] },
    { id: 'pyramid', label: 'PYRAMID',     short: '10/15/25/15/10',     sets: [10,15,25,15,10] },
  ],
  100: [
    { id: 'free',    label: 'FREE',        short: 'Free count',          sets: null },
    { id: '10x10',   label: '10 × 10',     short: 'Ten by ten',          sets: [10,10,10,10,10,10,10,10,10,10] },
    { id: '5x20',    label: '5 × 20',      short: 'Five by twenty',      sets: [20,20,20,20,20] },
    { id: '4x25',   label: '4 × 25',     short: 'Four by twenty-five', sets: [25,25,25,25] },
    { id: '2x50',    label: '2 × 50',      short: 'Two by fifty',        sets: [50,50] },
    { id: '20x5',    label: '20 × 5',      short: 'Death by fives',      sets: Array(20).fill(5) },
    { id: 'asc',     label: 'LADDER UP',   short: '10 → 40 ascending',   sets: [10,20,30,40] },
    { id: 'desc',    label: 'LADDER DOWN', short: '40 → 10 descending',  sets: [40,30,20,10] },
    { id: 'pyramid', label: 'PYRAMID',     short: '10/20/30/25/15',      sets: [10,20,30,25,15] },
  ],
};

const TODAY = () => {
  // Use the user's LOCAL time zone, not UTC. This means the streak
  // deadline is midnight in the user's actual time zone.
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function videoUrlFor(exercise) {
  if (exercise?.videoUrl) return exercise.videoUrl;
  const q = encodeURIComponent((exercise?.name || '') + ' proper form tutorial');
  return `https://www.youtube.com/results?search_query=${q}`;
}

const MEDALS = [
  { id: 'first',  label: 'FIRST DAY',   sub: 'Completed first workout', threshold: 1,   type: 'days' },
  { id: 'week',   label: '7-DAY STREAK',  sub: 'One week unbroken',       threshold: 7,   type: 'streak' },
  { id: 'month',  label: '30-DAY STREAK', sub: 'Thirty days strong',      threshold: 30,  type: 'streak' },
  { id: 'sixty',  label: '60-DAY STREAK', sub: 'Two months locked in',    threshold: 60,  type: 'streak' },
  { id: 'cent',   label: '100-DAY STREAK', sub: 'A hundred days. Legend.', threshold: 100, type: 'streak' },
];

function computeEarnedMedals(state) {
  const completedDays = state.history.filter((h) => h.completed).length;
  const bestStreak = state.bestStreak || state.streak || 0;
  return MEDALS.map((m) => {
    let earned = false;
    let progress = 0;
    if (m.type === 'days') {
      earned = completedDays >= m.threshold;
      progress = Math.min(1, completedDays / m.threshold);
    } else {
      earned = bestStreak >= m.threshold;
      progress = Math.min(1, bestStreak / m.threshold);
    }
    return { ...m, earned, progress };
  });
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const RECENT_WINDOW_DAYS = 30;

function buildPool(customExercises, disabledBuiltins, equipmentFilter, history = []) {
  const all = [...BUILTIN_EXERCISES, ...customExercises];

  // Step 1: filter by equipment + disabled builtins
  const eligible = all.filter((e) => {
    if (disabledBuiltins.includes(e.name)) return false;
    const eq = e.equipment || ['bodyweight'];
    return eq.some((tag) => equipmentFilter.includes(tag));
  });

  if (!eligible.length) {
    // Total fallback: nothing matches equipment, return bodyweight builtins
    return BUILTIN_EXERCISES.filter((e) => (e.equipment || []).includes('bodyweight'));
  }

  // Step 2: figure out which exercises were used in the last 30 days
  const now = new Date(TODAY() + 'T00:00:00');
  const recentlyUsedNames = new Set();
  for (const h of history) {
    if (!h.completed || !h.exercise) continue;
    const entryDate = new Date(h.date + 'T00:00:00');
    const daysAgo = Math.round((now - entryDate) / 86400000);
    if (daysAgo >= 0 && daysAgo < RECENT_WINDOW_DAYS) {
      recentlyUsedNames.add(h.exercise);
    }
  }

  // Step 3: prefer exercises NOT used recently
  const fresh = eligible.filter((e) => !recentlyUsedNames.has(e.name));
  if (fresh.length) return fresh;

  // Step 4: All eligible exercises have been used recently. Fall back
  // to the eligible pool, but sorted by "least recently used" first so
  // we still rotate variety even when the pool is exhausted.
  const lastUsedDate = (name) => {
    for (const h of history) {
      if (h.completed && h.exercise === name) return h.date;
    }
    return null;
  };
  return [...eligible].sort((a, b) => {
    const aDate = lastUsedDate(a.name);
    const bDate = lastUsedDate(b.name);
    if (!aDate) return -1;
    if (!bDate) return 1;
    return aDate.localeCompare(bDate); // earliest date first
  });
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function formatDuration(seconds) {
  if (seconds == null || seconds < 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const SEED_SUGGESTIONS = [
  { id: 'u_jordan',  name: 'Jordan M.',   handle: '@jordanm',  streak: 14 },
  { id: 'u_priya',   name: 'Priya K.',    handle: '@priyak',   streak: 42 },
  { id: 'u_marcus',  name: 'Marcus T.',   handle: '@marcust',  streak: 6 },
  { id: 'u_alex',    name: 'Alex Chen',   handle: '@alexc',    streak: 28 },
  { id: 'u_sam',     name: 'Sam Rivera',  handle: '@samr',     streak: 91 },
];

const SEED_INCOMING = [
  { id: 'u_taylor',  name: 'Taylor R.',   handle: '@taylorr',  streak: 9 },
];

const DEFAULT_STATE = {
  // Auth
  user: null,
  // Friends (mock — wire to backend later)
  friends: [],          // [{ id, name, handle, streak }]
  incomingRequests: [], // [{ id, name, handle, streak }]
  outgoingRequests: [], // [{ id, name, handle, streak }]
  suggestions: SEED_SUGGESTIONS,
  squads: [],           // [{ id, name, memberIds, dailyGoal }]
  // Workout session
  sessionStarted: false,
  workoutStarted: false,
  useTimer: false,
  timerStartedAt: null,
  timerAccumulated: 0,
  target: 100,
  equipment: ['bodyweight'],
  reps: 0,
  setsDone: [],
  schemeId: 'free',
  date: TODAY(),
  todayExercise: null,
  swapIndex: 0,
  // Streak / history
  streak: 0,
  bestStreak: 0,
  lastCompletedDate: null,
  history: [],
  // Admin
  customExercises: [],
  disabledBuiltins: [],
  adminMode: false,
  revealedDate: null, // last date the dramatic reveal played
};

// Fields we don't persist to the cloud (UI-only or device-only).
function cloudSafe(s) {
  if (!s) return {};
  const { user, ...rest } = s; // identity comes from Firebase, not the doc
  return rest;
}

// Reset the per-day fields if the saved date isn't today (used on both local
// load and cloud load so a streak expires correctly regardless of source).
function applyDayRollover(saved) {
  if (saved.date !== TODAY()) {
    if (saved.lastCompletedDate) {
      const gap = daysBetween(saved.lastCompletedDate, TODAY());
      if (gap > 1) saved.streak = 0;
    } else {
      saved.streak = 0;
    }
    saved.reps = 0;
    saved.setsDone = [];
    saved.schemeId = 'free';
    saved.date = TODAY();
    saved.swapIndex = 0;
    saved.todayExercise = null;
    saved.sessionStarted = false;
    saved.workoutStarted = false;
  }
  return saved;
}



function Fireworks() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const colors = ['#ff3d2e', '#ffd700', '#ff8c42', '#ffffff', '#ff6b9d', '#ffb300'];
    const rockets = [];
    const particles = [];

    function launch() {
      const x = W * (0.12 + Math.random() * 0.76);
      const targetY = H * (0.1 + Math.random() * 0.35);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const vy = -Math.sqrt(2 * 0.13 * (H - targetY)) * (0.95 + Math.random() * 0.1);
      rockets.push({
        x, y: H + 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy,
        color,
      });
    }

    function explode(r) {
      const count = 55 + Math.floor(Math.random() * 30);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.15;
        const speed = 1.4 + Math.random() * 3.6;
        particles.push({
          x: r.x, y: r.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.008 + Math.random() * 0.012,
          color: Math.random() < 0.18 ? '#ffffff' : r.color,
          size: 1.4 + Math.random() * 1.6,
        });
      }
    }

    let frame = 0;
    let lastLaunch = -999;
    let running = true;
    const LAUNCH_END_FRAME = 160;

    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      if (frame - lastLaunch > 8 + Math.random() * 10 && frame < LAUNCH_END_FRAME) {
        launch();
        if (Math.random() < 0.35) launch();
        lastLaunch = frame;
      }

      // rockets
      ctx.shadowBlur = 12;
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.13;
        ctx.shadowColor = r.color;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        if (r.vy >= 0) {
          explode(r);
          rockets.splice(i, 1);
        }
      }

      // particles
      ctx.shadowBlur = 10;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045;
        p.vx *= 0.985;
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = p.life;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      frame++;
      requestAnimationFrame(tick);
    }

    tick();
    return () => { running = false; };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 99,
      }}
    />
  );
}

function LightningBolts() {
  const [flashes, setFlashes] = useState([]);
  useEffect(() => {
    let mounted = true;
    const timings = [200, 700, 1300, 2100]; // staggered strikes
    timings.forEach((t) => {
      setTimeout(() => {
        if (!mounted) return;
        const id = Math.random();
        const x = 15 + Math.random() * 70; // % from left
        const rotation = -8 + Math.random() * 16; // slight tilt
        setFlashes((f) => [...f, { id, x, rotation }]);
        // remove after animation finishes
        setTimeout(() => {
          if (mounted) setFlashes((f) => f.filter((b) => b.id !== id));
        }, 700);
      }, t);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 98,
        overflow: 'hidden',
      }}
    >
      {flashes.map((b) => (
        <div
          key={b.id}
          style={{
            position: 'absolute',
            top: '-5%',
            left: `${b.x}%`,
            width: 8,
            height: '110%',
            transform: `rotate(${b.rotation}deg)`,
            transformOrigin: 'top center',
            animation: 'boltFlash 0.5s ease-out forwards',
          }}
        >
          <svg
            viewBox="0 0 20 600"
            width="40"
            height="100%"
            style={{
              position: 'absolute',
              top: 0,
              left: -16,
              filter: 'drop-shadow(0 0 12px rgba(255,235,120,0.9)) drop-shadow(0 0 30px rgba(255,210,80,0.7))',
            }}
          >
            <path
              d="M 12 0 L 4 220 L 14 230 L 6 420 L 16 430 L 8 600"
              stroke="#fff"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 12 0 L 4 220 L 14 230 L 6 420 L 16 430 L 8 600"
              stroke="#ffe066"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      ))}
      {/* white flash overlay - tied to bolt presence */}
      {flashes.length > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255, 240, 180, 0.18)',
            animation: 'whiteFlash 0.2s ease-out',
          }}
        />
      )}
    </div>
  );
}

export default function DailyHundred() {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [tab, setTab] = useState('log');
  const [showSchemes, setShowSchemes] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [countdown, setCountdown] = useState(null); // 10..1, 'GO', or null when inactive
  const [warmupActive, setWarmupActive] = useState(false);
  const [warmupPicks, setWarmupPicks] = useState([]);
  const [warmupDone, setWarmupDone] = useState([]);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownPicks, setCooldownPicks] = useState([]);
  const [cooldownDone, setCooldownDone] = useState([]);
  const [cooldownCelebrate, setCooldownCelebrate] = useState(false);
  const [showTimerPrompt, setShowTimerPrompt] = useState(false);
  const [tickNow, setTickNow] = useState(Date.now());
  const [historySort, setHistorySort] = useState('newest');
  const [expandedNote, setExpandedNote] = useState(null);
  const [revealActive, setRevealActive] = useState(false);
  const [revealName, setRevealName] = useState('');
  const [revealLanded, setRevealLanded] = useState(false);
  const revealTimeouts = useRef([]);
  const revealPickedRef = useRef(null); // date of the expanded row

  // Home-page pending selections (not persisted until START)
  const [pendingTarget, setPendingTarget] = useState(100);

  // Sign-in form state
  const [authMode, setAuthMode] = useState('options'); // 'options' | 'email-signup' | 'email-signin'
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState('');

  // Firebase sync internals
  const fbUidRef = useRef(null);        // current signed-in Firebase uid, or null
  const cloudLoadedRef = useRef(false); // have we loaded this user's cloud doc yet?
  const saveTimerRef = useRef(null);    // debounce handle for cloud writes

  // Friends UI
  const [friendsView, setFriendsView] = useState('friends'); // 'friends' | 'requests' | 'find' | 'squads'
  const [findQuery, setFindQuery] = useState('');
  const [creatingSquad, setCreatingSquad] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [squads, setSquads] = useState([]); // loaded from Firestore
  const [squadsLoading, setSquadsLoading] = useState(false);
  const [squadError, setSquadError] = useState('');
  const [squadBusy, setSquadBusy] = useState(false);
  const [squadView, setSquadView] = useState('list'); // 'list' | 'create' | 'join' | 'detail'
  const [activeSquad, setActiveSquad] = useState(null); // squad doc being viewed
  const [squadReactions, setSquadReactions] = useState({}); // { squadId: { reactionKey: [uid,...] } }
  const [pendingEquipment, setPendingEquipment] = useState(['bodyweight']);

  // Add-move form
  const [addingMove, setAddingMove] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTip, setNewTip] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newEquipment, setNewEquipment] = useState(['bodyweight']);
  const [addError, setAddError] = useState('');

  // Hidden admin unlock
  const tapTimesRef = useRef([]);
  function handleKickerTap() {
    if (!state) return;
    const now = Date.now();
    tapTimesRef.current = [...tapTimesRef.current.filter((t) => now - t < 3000), now];
    if (tapTimesRef.current.length >= 5) {
      tapTimesRef.current = [];
      const next = !state.adminMode;
      setState({ ...state, adminMode: next });
      if (!next && tab === 'moves') setTab('log');
    }
  }

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' && window.localStorage
        ? window.localStorage.getItem('daily100-state')
        : null;
      let saved = raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : { ...DEFAULT_STATE };
      saved = applyDayRollover(saved);
      // Firebase is the source of truth for identity. Don't trust a stale
      // logged-in user from localStorage — the auth listener sets it.
      saved.user = null;

      setState(saved);
      setPendingTarget(saved.target || 100);
      setPendingEquipment(saved.equipment && saved.equipment.length ? saved.equipment : ['bodyweight']);
    } catch {
      setState({ ...DEFAULT_STATE });
    }
    // Note: setLoading(false) happens in the auth listener below, once we know
    // whether a user is already signed in.
  }, []);

  // ---- Firebase auth listener: drives login/logout + cloud load/migration ----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        // Signed out: clear identity, keep local-only state on device.
        fbUidRef.current = null;
        cloudLoadedRef.current = false;
        setState((prev) => (prev ? { ...prev, user: null } : prev));
        setLoading(false);
        return;
      }
      fbUidRef.current = fbUser.uid;
      const profile = {
        provider: 'email',
        name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Athlete'),
        email: fbUser.email || '',
        uid: fbUser.uid,
      };
      try {
        const ref = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(ref);
        const cloud = snap.exists() ? snap.data() : null;
        setState((prev) => {
          // No migration: a returning user loads their cloud doc; a brand-new
          // account starts completely fresh (ignoring any local device data),
          // so new users never inherit a stray streak or workout history.
          let loaded = cloud
            ? { ...DEFAULT_STATE, ...cloud }
            : { ...DEFAULT_STATE };
          loaded = applyDayRollover(loaded);
          loaded.user = profile;
          // Keep pending selections aligned with whatever we loaded.
          setPendingTarget(loaded.target || 100);
          setPendingEquipment(loaded.equipment && loaded.equipment.length ? loaded.equipment : ['bodyweight']);
          return loaded;
        });
        cloudLoadedRef.current = true;
        // The debounced save effect will persist the loaded result to the cloud
        // now that cloudLoadedRef is true and state has updated.
      } catch {
        // Offline or rules issue: still let them in with identity. Start clean
        // rather than exposing any local-only data under the new account.
        setState((prev) => ({ ...DEFAULT_STATE, user: profile }));
        cloudLoadedRef.current = true;
      }
      setLoading(false);
      // Load squads for this user now that auth is confirmed
      if (fbUser) setupSquadListener();
    });
    return () => unsub();
  }, []);

  // Persist to localStorage (offline fallback) on every state change.
  useEffect(() => {
    if (!state) return;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('daily100-state', JSON.stringify(state));
      }
    } catch {
      // localStorage might be full or disabled — fail silently
    }
  }, [state]);

  // Persist to Firestore (debounced) whenever state changes and a user is loaded.
  useEffect(() => {
    if (!state || !fbUidRef.current || !cloudLoadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const ref = doc(db, 'users', fbUidRef.current);
        await setDoc(ref, cloudSafe(state), { merge: true });
      } catch {
        // Network hiccup — localStorage already has it; next change retries.
      }
    }, 1200);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [state]);

  // One real-time collection listener — keeps squads AND reactions live for all members.
  // Using a collection query (list permission) instead of per-doc listeners (get permission)
  // so that non-creator members can receive updates too.
  const squadUnsubRef = useRef(null);
  function setupSquadListener() {
    const uid = fbUidRef.current;
    if (!uid) return;
    if (squadUnsubRef.current) squadUnsubRef.current();
    setSquadsLoading(true);
    const q = query(collection(db, 'squads'), where('memberUids', 'array-contains', uid));
    squadUnsubRef.current = onSnapshot(q, (snap) => {
      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSquads(loaded);
      const reactions = {};
      snap.docs.forEach((d) => { reactions[d.id] = d.data().reactions || {}; });
      setSquadReactions(reactions);
      setSquadsLoading(false);
    }, () => { setSquadsLoading(false); });
  }

  const schemes = useMemo(
    () => SCHEMES_BY_TARGET[state?.target] || SCHEMES_BY_TARGET[100],
    [state]
  );
  const scheme = useMemo(
    () => schemes.find((s) => s.id === (state?.schemeId || 'free')) || schemes[0],
    [schemes, state]
  );

  const totalReps = useMemo(() => {
    if (!state) return 0;
    if (scheme.id === 'free') return state.reps;
    return (scheme.sets || []).reduce((sum, r, i) => sum + (state.setsDone[i] ? r : 0), 0);
  }, [state, scheme]);

  const target = state?.target || 100;
  const done = totalReps >= target;
  const exercise = state?.todayExercise || BUILTIN_EXERCISES[0];

  // Prior history for today's exercise — used for the recap block on the workout card
  const priorRuns = useMemo(() => {
    if (!state?.history || !exercise?.name) return [];
    return state.history.filter(
      (h) => h.exercise === exercise.name && h.date !== TODAY() && h.completed
    );
  }, [state?.history, exercise?.name]);
  const lastRunWithNotes = useMemo(
    () => priorRuns.find((h) => h.notes && h.notes.trim()),
    [priorRuns]
  );

  function registerCompletion(next) {
    let newStreak = state.streak;
    if (state.lastCompletedDate) {
      const gap = daysBetween(state.lastCompletedDate, TODAY());
      if (gap === 1) newStreak = state.streak + 1;
      else if (gap > 1) newStreak = 1;
    } else {
      newStreak = 1;
    }
    next.streak = newStreak;
    next.bestStreak = Math.max(state.bestStreak || 0, newStreak);
    next.lastCompletedDate = TODAY();
    // If timer was running, capture the total duration (accumulated + current segment)
    let duration = null;
    if (state.useTimer) {
      const acc = state.timerAccumulated || 0;
      const segment = state.timerStartedAt ? (Date.now() - state.timerStartedAt) / 1000 : 0;
      duration = Math.floor(acc + segment);
    }
    const entry = {
      date: TODAY(),
      exercise: exercise.name,
      reps: target,
      target,
      scheme: scheme.label,
      equipment: state.equipment,
      completed: true,
      duration, // seconds, or null if timer wasn't used
    };
    next.history = [entry, ...state.history.filter((h) => h.date !== TODAY())].slice(0, 60);
    // Stop the timer
    next.timerStartedAt = null;
    next.timerAccumulated = 0;
    setJustFinished(true);
    // Auto-mark completion in all squads this user belongs to
    if (squads.length > 0) {
      squads.forEach((squad) => markSquadComplete(squad, exercise.name));
    }
    // Haptic buzz on mobile when supported
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 50, 60, 50, 200]);
      }
    } catch {}
    setTimeout(() => setJustFinished(false), 4000);
    return next;
  }

  function addReps(n) {
    if (!state) return;
    const newReps = Math.min(target, state.reps + n);
    const completedNow = newReps >= target && state.reps < target;
    let next = { ...state, reps: newReps };
    if (completedNow) next = registerCompletion(next);
    setState(next);
  }

  function toggleSet(idx) {
    if (!state || !scheme.sets) return;
    const newSetsDone = [...state.setsDone];
    newSetsDone[idx] = !newSetsDone[idx];
    const newTotal = scheme.sets.reduce((s, r, i) => s + (newSetsDone[i] ? r : 0), 0);
    const wasDone = scheme.sets.reduce((s, r, i) => s + (state.setsDone[i] ? r : 0), 0) >= target;
    const completedNow = newTotal >= target && !wasDone;
    let next = { ...state, setsDone: newSetsDone };
    if (completedNow) next = registerCompletion(next);
    setState(next);
  }

  function reset() { setState({ ...state, reps: 0, setsDone: [] }); }

  function undoCompletion() {
    if (!window.confirm("Undo today's completion?\n\nYour streak will decrease by 1. Best streak and medals will stay.")) return;
    // Find the most recent completed entry that isn't today
    const previousEntry = state.history.find((h) => h.date !== TODAY() && h.completed);
    setState({
      ...state,
      reps: 0,
      setsDone: [],
      streak: Math.max(0, state.streak - 1),
      lastCompletedDate: previousEntry ? previousEntry.date : null,
      history: state.history.filter((h) => h.date !== TODAY()),
    });
  }
  function pickScheme(id) {
    setState({ ...state, schemeId: id, reps: 0, setsDone: [] });
    setShowSchemes(false);
  }
  function swap() {
    if (!state || totalReps > 0) return;
    if (state.swapIndex >= 2) return;
    const pool = buildPool(state.customExercises, state.disabledBuiltins, state.equipment, state.history);
    // If today's current exercise is in pool, advance past it; otherwise start at 0
    const currentIdx = pool.findIndex((e) => e.name === state.todayExercise?.name);
    const nextIdx = ((currentIdx < 0 ? -1 : currentIdx) + 1) % pool.length;
    setState({ ...state, todayExercise: pool[nextIdx], swapIndex: state.swapIndex + 1 });
  }

  // Auth handlers (UI scaffolding — wire to a real provider later)
  function friendlyAuthError(code) {
    switch (code) {
      case 'auth/email-already-in-use': return 'That email already has an account. Try signing in.';
      case 'auth/invalid-email': return 'That email address looks invalid.';
      case 'auth/weak-password': return 'Password must be at least 6 characters.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found': return 'Email or password is incorrect.';
      case 'auth/too-many-requests': return 'Too many attempts. Wait a moment and try again.';
      case 'auth/network-request-failed': return 'Network error. Check your connection.';
      default: return 'Something went wrong. Please try again.';
    }
  }

  function signInWith(provider) {
    // Apple/Google providers are deferred to a later phase. For now, nudge to email.
    setAuthError('');
    setAuthNotice(
      provider === 'apple'
        ? 'Apple sign-in is coming soon. Use email for now.'
        : 'Google sign-in is coming soon. Use email for now.'
    );
    setAuthMode('email-signup');
  }

  async function submitEmailAuth() {
    const email = authEmail.trim().toLowerCase();
    const name = authName.trim();
    const pwd = authPassword;
    setAuthNotice('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Enter a valid email address.');
      return;
    }
    if (pwd.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    if (authMode === 'email-signup' && !name) {
      setAuthError('Enter your name.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    try {
      if (authMode === 'email-signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, pwd);
        if (name) {
          try { await updateProfile(cred.user, { displayName: name }); } catch {}
        }
      } else {
        await signInWithEmailAndPassword(auth, email, pwd);
      }
      // The onAuthStateChanged listener handles loading state + cloud merge.
      setAuthEmail(''); setAuthName(''); setAuthPassword('');
      setAuthMode('options');
    } catch (e) {
      setAuthError(friendlyAuthError(e && e.code));
    } finally {
      setAuthBusy(false);
    }
  }

  async function sendReset() {
    const email = authEmail.trim().toLowerCase();
    setAuthNotice('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Enter your email above first, then tap reset.');
      return;
    }
    setAuthBusy(true);
    setAuthError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setAuthNotice('Password reset email sent. Check your inbox.');
    } catch (e) {
      setAuthError(friendlyAuthError(e && e.code));
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    if (!window.confirm('Sign out? Your progress is saved to your account.')) return;
    try {
      await fbSignOut(auth);
    } catch { /* listener will still clear identity if it can */ }
    setState((prev) => ({ ...prev, user: null, sessionStarted: false }));
    setAuthMode('options');
    setAuthNotice('');
    setAuthError('');
  }


  function resetStreak() {
    if (!window.confirm('Reset your streak to 0?\n\nYour best streak, medals, and workout history will stay — only the current streak counter resets.')) return;
    setState({ ...state, streak: 0, lastCompletedDate: null });
  }

  // ---- Friends handlers ----
  function sendFriendRequest(person) {
    if (state.outgoingRequests.find((p) => p.id === person.id)) return;
    if (state.friends.find((p) => p.id === person.id)) return;
    setState({
      ...state,
      outgoingRequests: [...state.outgoingRequests, person],
      suggestions: state.suggestions.filter((p) => p.id !== person.id),
    });
  }
  function cancelOutgoing(personId) {
    const person = state.outgoingRequests.find((p) => p.id === personId);
    setState({
      ...state,
      outgoingRequests: state.outgoingRequests.filter((p) => p.id !== personId),
      suggestions: person ? [person, ...state.suggestions] : state.suggestions,
    });
  }
  function acceptRequest(personId) {
    const person = state.incomingRequests.find((p) => p.id === personId);
    if (!person) return;
    setState({
      ...state,
      friends: [...state.friends, person],
      incomingRequests: state.incomingRequests.filter((p) => p.id !== personId),
    });
  }
  function declineRequest(personId) {
    setState({
      ...state,
      incomingRequests: state.incomingRequests.filter((p) => p.id !== personId),
    });
  }
  function removeFriend(personId) {
    if (!window.confirm('Remove this friend?')) return;
    setState({
      ...state,
      friends: state.friends.filter((p) => p.id !== personId),
      squads: state.squads.map((sq) => ({
        ...sq,
        memberIds: sq.memberIds.filter((id) => id !== personId),
      })).filter((sq) => sq.memberIds.length > 0),
    });
  }
  // ---- Squad helpers ----

  function generateJoinCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing 0/O/I/1
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  }


  // Create a new squad in Firestore
  async function createSquad() {
    const uid = fbUidRef.current;
    console.log('[Squad] createSquad called, uid:', uid, 'user:', state?.user?.name);
    if (!uid || !state?.user) {
      console.log('[Squad] Bailing — no uid or user');
      return;
    }
    const name = newSquadName.trim();
    if (!name) { setSquadError('Give your squad a name.'); return; }
    if (squads.length >= 3) { setSquadError('You can be in a maximum of 3 squads.'); return; }
    setSquadBusy(true);
    setSquadError('');
    try {
      // Ensure unique join code
      let code = generateJoinCode();
      let attempts = 0;
      while (attempts < 5) {
        const existing = await getDocs(query(collection(db, 'squads'), where('joinCode', '==', code)));
        if (existing.empty) break;
        code = generateJoinCode();
        attempts++;
      }
      const now = TODAY();
      const squadRef = doc(collection(db, 'squads'));
      const squadDoc = {
        name,
        joinCode: code,
        creatorUid: uid,
        memberUids: [uid],
        memberNames: { [uid]: state.user.name },
        streak: 0,
        bestStreak: 0,
        lastStreakDate: null,
        completedToday: [], // uids who completed today
        completedTodayDate: null, // local date string for completedToday
        allCompleteStreak: 0, // consecutive days ALL members completed
        allCompleteStreakDate: null, // local date string of last all-complete day
        saves: 0,
        createdAt: now,
      };
      console.log('[Squad] Generated code:', code, 'Writing to Firestore...');
      await setDoc(squadRef, squadDoc);
      console.log('[Squad] Created successfully:', squadRef.id);
      setSquads((prev) => [...prev, { id: squadRef.id, ...squadDoc }]);
      setNewSquadName('');
      setSquadView('list');
    } catch (e) {
      console.error('[Squad] Error creating squad:', e.code, e.message);
      setSquadError('Could not create squad. Try again.');
    }
    setSquadBusy(false);
  }

  // Join a squad by 6-character code
  async function joinSquad() {
    const uid = fbUidRef.current;
    if (!uid || !state?.user) return;
    const code = joinCodeInput.trim().toUpperCase();
    if (code.length !== 6) { setSquadError('Enter the 6-character squad code.'); return; }
    if (squads.length >= 3) { setSquadError('You can be in a maximum of 3 squads.'); return; }
    setSquadBusy(true);
    setSquadError('');
    try {
      const q = query(collection(db, 'squads'), where('joinCode', '==', code));
      const snap = await getDocs(q);
      if (snap.empty) { setSquadError('No squad found with that code.'); setSquadBusy(false); return; }
      const squadDoc = snap.docs[0];
      const data = squadDoc.data();
      if (data.memberUids.includes(uid)) { setSquadError("You're already in this squad."); setSquadBusy(false); return; }
      if (data.memberUids.length >= 4) { setSquadError('That squad is full (max 4 members).'); setSquadBusy(false); return; }
      await updateDoc(squadDoc.ref, {
        memberUids: arrayUnion(uid),
        [`memberNames.${uid}`]: state.user.name,
      });
      const updated = { id: squadDoc.id, ...data, memberUids: [...data.memberUids, uid], memberNames: { ...data.memberNames, [uid]: state.user.name } };
      setSquads((prev) => [...prev, updated]);
      setJoinCodeInput('');
      setSquadView('list');
    } catch (e) {
      setSquadError('Could not join squad. Try again.');
      console.error(e);
    }
    setSquadBusy(false);
  }

  // Leave a squad; dissolve if fewer than 2 members remain
  async function leaveSquad(squadId) {
    const uid = fbUidRef.current;
    if (!uid) return;
    if (!window.confirm('Leave this squad? If fewer than 2 members remain it will dissolve.')) return;
    setSquadBusy(true);
    try {
      const ref = doc(db, 'squads', squadId);
      const snap = await getDoc(ref);
      if (!snap.exists()) { setSquads((p) => p.filter((s) => s.id !== squadId)); setSquadBusy(false); return; }
      const data = snap.data();
      const remaining = data.memberUids.filter((id) => id !== uid);
      if (remaining.length < 2) {
        // Dissolve the squad
        await deleteDoc(ref);
      } else {
        await updateDoc(ref, {
          memberUids: arrayRemove(uid),
          [`memberNames.${uid}`]: deleteField(), // remove from name map
        });
      }
      setSquads((p) => p.filter((s) => s.id !== squadId));
      setSquadView('list');
      setActiveSquad(null);
    } catch (e) {
      console.error('leaveSquad error', e);
    }
    setSquadBusy(false);
  }

  async function toggleReaction(squadId, memberUid, emojiKey) {
    const myUid = fbUidRef.current;
    if (!myUid) return;
    const reactionKey = `${TODAY()}__${memberUid}__${emojiKey}`;
    const currentReactors = squadReactions[squadId]?.[reactionKey] || [];
    const alreadyReacted = currentReactors.includes(myUid);

    // Optimistic update
    setSquadReactions((prev) => {
      const existing = prev[squadId] || {};
      const reactors = existing[reactionKey] || [];
      return {
        ...prev,
        [squadId]: {
          ...existing,
          [reactionKey]: alreadyReacted
            ? reactors.filter((id) => id !== myUid)
            : [...reactors, myUid],
        },
      };
    });

    const squadRef = doc(db, 'squads', squadId);
    try {
      await updateDoc(squadRef, {
        [`reactions.${reactionKey}`]: alreadyReacted ? arrayRemove(myUid) : arrayUnion(myUid),
      });
    } catch {
      try {
        await setDoc(squadRef, {
          reactions: { [reactionKey]: alreadyReacted ? [] : [myUid] },
        }, { merge: true });
      } catch {
        // Revert optimistic update on failure
        setSquadReactions((prev) => ({
          ...prev,
          [squadId]: { ...(prev[squadId] || {}), [reactionKey]: currentReactors },
        }));
      }
    }
  }

  // Mark today's workout complete for this user in a squad
  async function markSquadComplete(squad, exerciseName) {
    const uid = fbUidRef.current;
    if (!uid) return;
    const today = TODAY();
    // Only skip if the existing completedToday is actually from today
    if (squad.completedTodayDate === today && squad.completedToday?.includes(uid)) return;
    const ref = doc(db, 'squads', squad.id);
    try {
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      // Reset completedToday and memberExercises if it's from a previous day
      const isNewDay = data.completedTodayDate !== today;
      const currentCompleted = isNewDay ? [] : (data.completedToday || []);
      if (!isNewDay && currentCompleted.includes(uid)) return;
      const newCompleted = [...currentCompleted, uid];
      const memberCount = data.memberUids.length;
      const threshold = Math.ceil(memberCount * 0.5); // 50% rounded up
      let newStreak = data.streak || 0;
      let newBest = data.bestStreak || 0;
      let newSaves = data.saves || 0;
      let newLastDate = data.lastStreakDate;

      // Check if this completion tips us over 50% for today
      if (newCompleted.length >= threshold && data.lastStreakDate !== today) {
        // Did the streak survive from yesterday? Use local date, not UTC.
        const yDate = new Date();
        yDate.setDate(yDate.getDate() - 1);
        const yStr = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;
        if (data.lastStreakDate === yStr || data.lastStreakDate === null) {
          newStreak = (data.streak || 0) + 1;
        } else {
          // Gap — check saves
          if (newSaves > 0) {
            newStreak = (data.streak || 0) + 1;
            newSaves = newSaves - 1;
          } else {
            newStreak = 1;
          }
        }
        newBest = Math.max(newStreak, newBest);
        newLastDate = today;
      }

      // Track consecutive days where ALL members completed → earn a save every 7 in a row
      let newAllCompleteStreak = data.allCompleteStreak || 0;
      let newAllCompleteDate = data.allCompleteStreakDate || null;
      if (newCompleted.length >= memberCount && data.allCompleteStreakDate !== today) {
        const yDate = new Date();
        yDate.setDate(yDate.getDate() - 1);
        const yStr = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;
        newAllCompleteStreak = (data.allCompleteStreakDate === yStr) ? newAllCompleteStreak + 1 : 1;
        newAllCompleteDate = today;
        if (newAllCompleteStreak >= 7 && newSaves < 5) {
          newSaves = newSaves + 1;
          newAllCompleteStreak = 0;
        }
      }

      const currentExercises = isNewDay ? {} : (data.memberExercises || {});
      const newExercises = exerciseName ? { ...currentExercises, [uid]: exerciseName } : currentExercises;

      await updateDoc(ref, {
        completedToday: newCompleted,
        completedTodayDate: today,
        memberExercises: newExercises,
        streak: newStreak,
        bestStreak: newBest,
        lastStreakDate: newLastDate,
        saves: newSaves,
        allCompleteStreak: newAllCompleteStreak,
        allCompleteStreakDate: newAllCompleteDate,
      });

      // Update local state
      setSquads((prev) => prev.map((s) =>
        s.id === squad.id
          ? { ...s, completedToday: newCompleted, completedTodayDate: today, memberExercises: newExercises, streak: newStreak, bestStreak: newBest, lastStreakDate: newLastDate, saves: newSaves, allCompleteStreak: newAllCompleteStreak, allCompleteStreakDate: newAllCompleteDate }
          : s
      ));
      if (activeSquad?.id === squad.id) {
        setActiveSquad((s) => ({ ...s, completedToday: newCompleted, completedTodayDate: today, memberExercises: newExercises, streak: newStreak, bestStreak: newBest, lastStreakDate: newLastDate, saves: newSaves, allCompleteStreak: newAllCompleteStreak, allCompleteStreakDate: newAllCompleteDate }));
      }
    } catch (e) {
      console.error('markSquadComplete error', e);
    }
  }

  function deleteSquad(squadId) {
    // kept as stub — real deletion happens in leaveSquad when members drop below 2
  }



  function clearRevealTimeouts() {
    revealTimeouts.current.forEach((id) => clearTimeout(id));
    revealTimeouts.current = [];
  }

  function runRevealSequence(pool, picked) {
    // Slot machine: names tick by, slowing dramatically, landing on picked
    // Total ~3.5s of cycling + 2.5s hold on landed = ~6s end-to-end
    const delays = [55, 55, 55, 73, 73, 91, 119, 155, 201, 265, 347, 457, 640, 914];
    let cumulative = 0;
    delays.forEach((delay, i) => {
      cumulative += delay;
      const isLast = i === delays.length - 1;
      const id = setTimeout(() => {
        if (isLast) {
          // Landing moment — picked exercise, big haptic, flash + scale
          setRevealName(picked.name);
          setRevealLanded(true);
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([80, 60, 80, 60, 250]);
            }
          } catch {}
        } else {
          // Cycle: pick a random pool name and a small haptic tick
          const randomEx = pool[Math.floor(Math.random() * pool.length)];
          setRevealName(randomEx.name);
          try {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(12);
            }
          } catch {}
        }
      }, cumulative);
      revealTimeouts.current.push(id);
    });
    // After hold on the landed name, commit the session
    const commitId = setTimeout(() => commitSession(picked, true), cumulative + 2500);
    revealTimeouts.current.push(commitId);
  }

  function commitSession(picked, fromReveal) {
    clearRevealTimeouts();
    setRevealActive(false);
    setRevealLanded(false);
    setState((prev) => ({
      ...prev,
      target: pendingTarget,
      equipment: pendingEquipment,
      sessionStarted: true,
      workoutStarted: false,
      useTimer: false,
      timerStartedAt: null,
      timerAccumulated: 0,
      reps: 0,
      setsDone: [],
      schemeId: 'free',
      todayExercise: picked,
      revealedDate: fromReveal ? TODAY() : prev.revealedDate,
    }));
  }

  function skipReveal() {
    const picked = revealPickedRef.current;
    if (!picked) return;
    clearRevealTimeouts();
    setRevealName(picked.name);
    setRevealLanded(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 50, 200]);
      }
    } catch {}
    const id = setTimeout(() => commitSession(picked, true), 700);
    revealTimeouts.current.push(id);
  }

  function startSession() {
    if (!pendingEquipment.length) return;
    const pool = buildPool(state.customExercises, state.disabledBuiltins, pendingEquipment, state.history);
    if (!pool.length) return;
    const picked = pool[hashStr(TODAY() + pendingEquipment.join('-')) % pool.length];

    // If user already saw today's reveal, skip straight to workout
    if (state.revealedDate === TODAY()) {
      commitSession(picked, false);
      return;
    }

    // Start the dramatic slot machine reveal
    revealPickedRef.current = picked;
    setRevealLanded(false);
    setRevealName(pool[Math.floor(Math.random() * pool.length)].name);
    setRevealActive(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    } catch {}
    runRevealSequence(pool, picked);
  }

  function startWarmup() {
    if (WARMUP_EXERCISES.length < 3) return;
    const shuffled = [...WARMUP_EXERCISES].sort(() => Math.random() - 0.5);
    setWarmupPicks(shuffled.slice(0, 3));
    setWarmupDone([false, false, false]);
    setWarmupActive(true);
  }

  function toggleWarmupDone(i) {
    setWarmupDone((prev) => prev.map((d, idx) => (idx === i ? !d : d)));
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
    } catch {}
  }

  function finishWarmup() {
    setWarmupActive(false);
    setWarmupPicks([]);
    setWarmupDone([]);
  }

  function startCooldown() {
    if (COOLDOWN_EXERCISES.length < 2) return;
    const shuffled = [...COOLDOWN_EXERCISES].sort(() => Math.random() - 0.5);
    setCooldownPicks(shuffled.slice(0, 2));
    setCooldownDone([false, false]);
    setCooldownActive(true);
  }

  function toggleCooldownDone(i) {
    setCooldownDone((prev) => {
      const next = prev.map((d, idx) => (idx === i ? !d : d));
      // If this tap completed all stretches, trigger celebration
      if (next.every(Boolean) && !prev.every(Boolean)) {
        setTimeout(() => setCooldownCelebrate(true), 250);
        // Haptic finishing pattern
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([60, 50, 60, 50, 200]);
          }
        } catch {}
      }
      return next;
    });
    // Regular tap haptic
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
    } catch {}
  }

  function finishCooldown() {
    setCooldownActive(false);
    setCooldownPicks([]);
    setCooldownDone([]);
    setCooldownCelebrate(false);
  }

  function skipCooldown() {
    // Trigger the same celebration as completing the cooldown,
    // then the useEffect on cooldownCelebrate will auto-return home after 5.5s.
    setCooldownCelebrate(true);
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 50, 60, 50, 200]);
      }
    } catch {}
  }

  function completeCooldown() {
    // Exit cooldown overlay
    setCooldownActive(false);
    setCooldownPicks([]);
    setCooldownDone([]);
    setCooldownCelebrate(false);
    // End the workout session — return to home/setup screen
    setState((prev) => ({
      ...prev,
      sessionStarted: false,
      workoutStarted: false,
    }));
    // Pre-fill home picks with what was just used
    if (state) {
      setPendingTarget(state.target);
      setPendingEquipment(state.equipment);
    }
  }

  // After cooldown celebration shows, auto-return to home after the fade sequence completes
  useEffect(() => {
    if (!cooldownCelebrate) return;
    const t = setTimeout(() => completeCooldown(), 5500);
    return () => clearTimeout(t);
  }, [cooldownCelebrate]);

  // Tick the workout timer once per second when active
  useEffect(() => {
    if (!state?.useTimer || !state?.timerStartedAt) return;
    setTickNow(Date.now());
    const id = setInterval(() => setTickNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state?.useTimer, state?.timerStartedAt]);

  function beginWorkout() {
    setShowTimerPrompt(true);
  }

  function chooseTimer(useIt) {
    setShowTimerPrompt(false);
    setState((prev) => ({ ...prev, useTimer: !!useIt, timerStartedAt: null, timerAccumulated: 0 }));
    // Begin the 10-second countdown
    setCountdown(10);
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
    } catch {}
  }

  function pauseTimer() {
    if (!state?.timerStartedAt) return;
    const segmentSeconds = (Date.now() - state.timerStartedAt) / 1000;
    setState((prev) => ({
      ...prev,
      timerAccumulated: (prev.timerAccumulated || 0) + segmentSeconds,
      timerStartedAt: null,
    }));
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
    } catch {}
  }

  function resumeTimer() {
    if (state?.timerStartedAt) return; // already running
    setState((prev) => ({ ...prev, timerStartedAt: Date.now() }));
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
    } catch {}
  }

  function resetTimer() {
    if (!window.confirm('Reset timer back to 0:00?')) return;
    setState((prev) => ({
      ...prev,
      timerAccumulated: 0,
      timerStartedAt: null, // Always pause on reset — user must tap RESUME to start again
    }));
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
    } catch {}
  }

  // Update a history entry's notes inline (saves on every keystroke)
  function updateHistoryNote(date, value) {
    setState((prev) => ({
      ...prev,
      history: prev.history.map((h) =>
        h.date === date
          ? { ...h, notes: value.trim() ? value : undefined }
          : h
      ),
    }));
  }

  const sortedHistory = useMemo(() => {
    const list = [...(state?.history || [])];
    if (historySort === 'oldest') {
      return list.slice().reverse();
    }
    if (historySort === 'alpha') {
      return list.sort((a, b) =>
        (a.exercise || '').localeCompare(b.exercise || '')
      );
    }
    return list; // 'newest' — already in newest-first order
  }, [state?.history, historySort]);

  function skipCountdown() {
    setCountdown(null);
    setState((prev) => ({
      ...prev,
      workoutStarted: true,
      timerStartedAt: prev.useTimer ? Date.now() : null,
    }));
  }

  // Tick the countdown
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 'GO') {
      const t = setTimeout(() => {
        setCountdown(null);
        setState((prev) => ({
          ...prev,
          workoutStarted: true,
          timerStartedAt: prev.useTimer ? Date.now() : null,
        }));
      }, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (countdown === 1) {
        setCountdown('GO');
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 200]);
        } catch {}
      } else {
        setCountdown(countdown - 1);
        // Longer buzz for last 3 seconds
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(countdown <= 4 ? 60 : 25);
          }
        } catch {}
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function changeWorkout() {
    if (totalReps > 0 && !done) {
      if (!window.confirm('Discard current progress and pick a new workout?')) return;
    }
    setCountdown(null);
    setPendingTarget(state.target);
    setPendingEquipment(state.equipment);
    setState({ ...state, sessionStarted: false, workoutStarted: false, useTimer: false, timerStartedAt: null, timerAccumulated: 0, reps: 0, setsDone: [] });
  }

  function togglePendingEquipment(id) {
    setPendingEquipment((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  }

  // Admin: custom moves
  function openAddForm() {
    setAddingMove(true);
    setNewName(''); setNewTip(''); setNewVideoUrl('');
    setNewEquipment(['bodyweight']);
    setAddError('');
  }
  function cancelAdd() { setAddingMove(false); setAddError(''); }
  function saveMove() {
    const cleanName = newName.trim().toUpperCase();
    const cleanTip = newTip.trim();
    const cleanVideoUrl = newVideoUrl.trim();
    if (!cleanName) { setAddError('Name is required.'); return; }
    if (!newEquipment.length) { setAddError('Pick at least one equipment.'); return; }
    if (cleanVideoUrl && !/^https?:\/\//i.test(cleanVideoUrl)) {
      setAddError('Video URL must start with http:// or https://');
      return;
    }
    const allNames = [...BUILTIN_EXERCISES.map((e) => e.name), ...state.customExercises.map((e) => e.name)];
    if (allNames.includes(cleanName)) { setAddError('A move with that name already exists.'); return; }
    const newMove = {
      name: cleanName,
      tip: cleanTip || 'Your custom move.',
      equipment: newEquipment,
      ...(cleanVideoUrl ? { videoUrl: cleanVideoUrl } : {}),
    };
    setState({ ...state, customExercises: [...state.customExercises, newMove] });
    setAddingMove(false); setAddError('');
  }
  function deleteCustom(name) {
    setState({ ...state, customExercises: state.customExercises.filter((e) => e.name !== name) });
  }
  function toggleBuiltin(name) {
    const isOff = state.disabledBuiltins.includes(name);
    const next = isOff ? state.disabledBuiltins.filter((n) => n !== name) : [...state.disabledBuiltins, name];
    setState({ ...state, disabledBuiltins: next });
  }
  function toggleNewEquipment(id) {
    setNewEquipment((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  if (loading || !state) {
    return <div style={styles.loadingWrap}><div style={styles.loadingDot} /></div>;
  }

  // ---------------- SIGN-IN SCREEN ----------------
  if (!state.user) {
    return (
      <div style={styles.shell}>
        <style>{cssText}</style>
        <div style={styles.authFrame}>
          <div style={styles.authBrand}>
            <div style={styles.authKicker}>DAILY 100</div>
            <h1 style={styles.authTitle}>ONE MOVEMENT.<br />100 REPS.<br />EVERY DAY.</h1>
          </div>

          {authMode === 'options' && (
            <>
              <button style={styles.appleBtn} onClick={() => signInWith('apple')}>
                CONTINUE WITH APPLE
              </button>
              <button style={styles.googleBtn} onClick={() => signInWith('google')}>
                CONTINUE WITH GOOGLE
              </button>
              <div style={styles.authDivider}>
                <span style={styles.authDividerLine} />
                <span style={styles.authDividerText}>OR</span>
                <span style={styles.authDividerLine} />
              </div>
              <button style={styles.emailBtn} onClick={() => { setAuthMode('email-signup'); setAuthError(''); }}>
                SIGN UP WITH EMAIL
              </button>
              <button style={styles.authTextLink} onClick={() => { setAuthMode('email-signin'); setAuthError(''); }}>
                Already have an account? Sign in
              </button>
              {authNotice && <div style={styles.authNoticeText}>{authNotice}</div>}
              <div style={styles.authFinePrint}>
                By continuing, you agree to break a sweat.
              </div>
            </>
          )}

          {(authMode === 'email-signup' || authMode === 'email-signin') && (
            <div style={styles.authForm}>
              <div style={styles.authFormTitle}>
                {authMode === 'email-signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
              </div>
              {authMode === 'email-signup' && (
                <>
                  <div style={styles.authLabel}>NAME</div>
                  <input
                    placeholder="Your name"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    style={styles.authInput}
                    autoComplete="name"
                  />
                </>
              )}
              <div style={styles.authLabel}>EMAIL</div>
              <input
                placeholder="you@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                style={styles.authInput}
                type="email"
                autoComplete="email"
              />
              <div style={styles.authLabel}>PASSWORD</div>
              <input
                placeholder="At least 6 characters"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                style={styles.authInput}
                type="password"
                autoComplete={authMode === 'email-signup' ? 'new-password' : 'current-password'}
              />
              {authError && <div style={styles.authErrorText}>{authError}</div>}
              {authNotice && <div style={styles.authNoticeText}>{authNotice}</div>}
              <button
                style={{ ...styles.authSubmitBtn, opacity: authBusy ? 0.6 : 1 }}
                onClick={submitEmailAuth}
                disabled={authBusy}
              >
                {authBusy
                  ? 'WORKING…'
                  : `${authMode === 'email-signup' ? 'CREATE ACCOUNT' : 'SIGN IN'} →`}
              </button>
              {authMode === 'email-signin' && (
                <button
                  style={styles.authTextLink}
                  onClick={sendReset}
                  disabled={authBusy}
                >
                  Forgot password?
                </button>
              )}
              <button
                style={styles.authTextLink}
                onClick={() => {
                  setAuthMode(authMode === 'email-signup' ? 'email-signin' : 'email-signup');
                  setAuthError('');
                  setAuthNotice('');
                }}
              >
                {authMode === 'email-signup'
                  ? 'Already have an account? Sign in'
                  : 'Need an account? Sign up'}
              </button>
              <button
                style={styles.authBackLink}
                onClick={() => { setAuthMode('options'); setAuthError(''); }}
              >
                ← Other sign-in options
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const dateLabel = new Date(state.date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });

  // ---------------- DAILY REVEAL SCREEN (slot machine) ----------------
  if (revealActive) {
    return (
      <div style={styles.shell}>
        <style>{cssText}</style>
        <div
          style={{
            ...styles.revealOverlay,
            ...(revealLanded ? styles.revealOverlayLanded : {}),
          }}
          onClick={skipReveal}
        >
          <div style={styles.revealInner}>
            <div style={styles.revealLabel}>TODAY'S MOVEMENT</div>
            <div
              key={revealName /* re-mounts on each name change for animation */}
              style={{
                ...styles.revealName,
                ...(revealLanded ? styles.revealNameLanded : {}),
              }}
            >
              {revealName}
            </div>
            <div style={styles.revealEquipChip}>
              {(pendingEquipment || []).map((e) => e.toUpperCase()).join(' · ')}
            </div>
            {!revealLanded && (
              <div style={styles.revealSkipHint}>TAP TO SKIP</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------- WARMUP SCREEN ----------------
  if (warmupActive) {
    const allDone = warmupDone.every(Boolean);
    return (
      <div style={styles.shell}>
        <style>{cssText}</style>
        <div style={styles.frame}>
          <div style={styles.headerRow}>
            <button style={styles.changeLink} onClick={finishWarmup}>← BACK</button>
            <div style={styles.kicker}>DAILY 100 · {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
            <button style={styles.menuBtn} onClick={() => { setShowSheet(true); setTab('log'); }}>MENU</button>
          </div>

          <div style={styles.divider} />

          <h1 style={styles.warmupTitle}>WARMUP</h1>
          <div style={styles.warmupSubtitle}>3 movements · about 3 minutes</div>
          <div style={styles.warmupNote}>Not counted toward your streak.</div>

          <div style={styles.warmupList}>
            {warmupPicks.map((w, i) => {
              const done = warmupDone[i];
              return (
                <button
                  key={i}
                  onClick={() => toggleWarmupDone(i)}
                  style={{
                    ...styles.warmupCard,
                    background: done ? 'var(--accent-gradient)' : 'var(--surface)',
                    color: done ? '#fff' : 'var(--text)',
                    borderColor: done ? 'transparent' : 'var(--border)',
                    boxShadow: done ? '0 4px 14px var(--accent-shadow-md)' : '0 1px 3px var(--shadow-sm)',
                  }}
                >
                  <div style={styles.warmupCardTop}>
                    <span style={{
                      ...styles.warmupNumber,
                      background: done ? 'rgba(255,255,255,0.22)' : 'var(--surface-muted)',
                      color: done ? '#fff' : 'var(--text-muted)',
                    }}>{i + 1}</span>
                    <span style={styles.warmupName}>{w.name}</span>
                    <span style={styles.warmupReps}>{w.reps}</span>
                  </div>
                  <div style={{
                    ...styles.warmupTip,
                    color: done ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                  }}>{w.tip}</div>
                  <div style={{
                    ...styles.warmupCheck,
                    color: done ? '#fff' : 'var(--text-muted)',
                  }}>{done ? '✓ DONE' : 'TAP WHEN COMPLETE'}</div>
                </button>
              );
            })}
          </div>

          {allDone && (
            <button style={styles.startBtn} onClick={finishWarmup}>
              FINISHED → BACK TO SETUP
            </button>
          )}

          <div style={styles.footer}>
            <span>LOOSEN UP.</span>
            <span>BREATHE.</span>
          </div>
        </div>

        {showSheet && renderSheet()}
      </div>
    );
  }

  // ---------------- COOLDOWN SCREEN ----------------
  if (cooldownActive) {
    return (
      <div style={styles.shell}>
        <style>{cssText}</style>
        <div style={styles.frame}>
          <div style={styles.headerRow}>
            <button style={styles.changeLink} onClick={finishCooldown}>← BACK</button>
            <div style={styles.kicker}>DAILY 100 · {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
            <button style={styles.menuBtn} onClick={() => { setShowSheet(true); setTab('log'); }}>MENU</button>
          </div>

          <div style={styles.divider} />

          <h1 style={styles.warmupTitle}>COOL DOWN</h1>
          <div style={styles.warmupSubtitle}>2 stretches · breathe slowly</div>
          <div style={styles.warmupNote}>Not counted toward your streak.</div>

          <div style={styles.warmupList}>
            {cooldownPicks.map((c, i) => {
              const done = cooldownDone[i];
              return (
                <button
                  key={i}
                  onClick={() => toggleCooldownDone(i)}
                  style={{
                    ...styles.warmupCard,
                    background: done ? 'var(--accent-gradient)' : 'var(--surface)',
                    color: done ? '#fff' : 'var(--text)',
                    borderColor: done ? 'transparent' : 'var(--border)',
                    boxShadow: done ? '0 4px 14px var(--accent-shadow-md)' : '0 1px 3px var(--shadow-sm)',
                  }}
                >
                  <div style={styles.warmupCardTop}>
                    <span style={{
                      ...styles.warmupNumber,
                      background: done ? 'rgba(255,255,255,0.22)' : 'var(--surface-muted)',
                      color: done ? '#fff' : 'var(--text-muted)',
                    }}>{i + 1}</span>
                    <span style={styles.warmupName}>{c.name}</span>
                    <span style={styles.warmupReps}>{c.duration}</span>
                  </div>
                  <div style={{
                    ...styles.warmupTip,
                    color: done ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)',
                  }}>{c.tip}</div>
                  <div style={{
                    ...styles.warmupCheck,
                    color: done ? '#fff' : 'var(--text-muted)',
                  }}>{done ? '✓ DONE' : 'TAP WHEN COMPLETE'}</div>
                </button>
              );
            })}
          </div>

          <div style={styles.footer}>
            <span>SLOW BREATHS.</span>
            <span>WELL DONE.</span>
          </div>
        </div>

        {cooldownCelebrate && (
          <div style={styles.cooldownCelebrate}>
            <div style={styles.cooldownCelebrateTitle}>AMAZING WORK<br />TODAY</div>
            <div style={styles.cooldownCelebrateSub}>SEE YOU<br />TOMORROW</div>
          </div>
        )}

        {showSheet && renderSheet()}
      </div>
    );
  }

  // ---------------- HOME SCREEN ----------------
  if (!state.sessionStarted) {
    const previewPool = buildPool(state.customExercises, state.disabledBuiltins, pendingEquipment, state.history);
    const canStart = pendingEquipment.length > 0 && previewPool.length > 0;

    return (
      <div style={styles.shell}>
        <style>{cssText}</style>
        <div style={styles.frame}>
          <div style={styles.headerRow}>
            <div>
              {state.user?.name && (
                <div style={styles.welcomeLine}>
                  Welcome back, {state.user.name.split(' ')[0]}
                </div>
              )}
              <div
                style={{ ...styles.kicker, cursor: 'default', userSelect: 'none' }}
                onClick={handleKickerTap}
              >
                {state.adminMode ? '▪ ' : ''}DAILY 100 · {dateLabel.toUpperCase()}
              </div>
              <div style={styles.streakLine}>
                <span style={styles.streakNum}>{state.streak}</span>
                <span style={styles.streakLabel}>
                  DAY{state.streak === 1 ? '' : 'S'}<br />STREAK
                </span>
              </div>
            </div>
            <button style={styles.menuBtn} onClick={() => { setShowSheet(true); setTab('log'); }}>MENU</button>
          </div>

          <div style={styles.divider} />

          {/* Warmup bar */}
          <button style={styles.warmupBar} onClick={startWarmup}>
            <span style={styles.warmupQuestion}>Need a quick warmup first?</span>
            <span style={styles.warmupBarBtn}>WARM UP →</span>
          </button>

          {/* Target picker */}
          <div style={styles.section}>
            <button
              style={{
                ...styles.targetBtn,
                ...styles.primaryTargetBtn,
                background: pendingTarget === 100 ? 'var(--text)' : 'var(--surface)',
                color: pendingTarget === 100 ? 'var(--bg-solid)' : 'var(--text)',
                boxShadow: pendingTarget === 100 ? '0 6px 18px var(--shadow-charcoal)' : '0 1px 3px var(--shadow-sm)',
                border: pendingTarget === 100 ? '1.5px solid var(--text)' : '1.5px solid var(--border)',
              }}
              onClick={() => setPendingTarget(100)}
            >
              <div style={styles.targetBtnNum}>100</div>
              <div style={styles.targetBtnLabel}>REPS</div>
            </button>

            <div style={styles.scaledHeader}>SCALED OPTIONS</div>
            <div style={styles.scaledRow}>
              {[50, 75].map((t) => {
                const active = pendingTarget === t;
                return (
                  <button
                    key={t}
                    style={{
                      ...styles.targetBtn,
                      background: active ? 'var(--text)' : 'var(--surface)',
                      color: active ? 'var(--bg-solid)' : 'var(--text)',
                      boxShadow: active ? '0 6px 18px var(--shadow-charcoal)' : '0 1px 3px var(--shadow-sm)',
                      border: active ? '1.5px solid var(--text)' : '1.5px solid var(--border)',
                    }}
                    onClick={() => setPendingTarget(t)}
                  >
                    <div style={styles.scaledTargetBtnNum}>{t}</div>
                    <div style={styles.scaledTargetBtnLabel}>REPS</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Equipment picker */}
          <div style={styles.section}>
            <div style={styles.sectionLabel}>EQUIPMENT · PICK ONE OR MORE</div>
            <div style={styles.equipCol}>
              {EQUIPMENT_OPTIONS.map((eq) => {
                const active = pendingEquipment.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    style={{
                      ...styles.equipBtn,
                      background: active ? 'var(--text)' : 'var(--surface)',
                      color: active ? 'var(--bg-solid)' : 'var(--text)',
                      borderColor: active ? 'var(--text)' : 'var(--border)',
                      boxShadow: active ? '0 4px 14px var(--shadow-charcoal)' : '0 1px 3px var(--shadow-sm)',
                    }}
                    onClick={() => togglePendingEquipment(eq.id)}
                  >
                    <span style={styles.equipLabel}>{eq.label}</span>
                    <span style={{
                      ...styles.equipCheck,
                      background: active ? 'var(--accent)' : 'transparent',
                      borderColor: active ? 'var(--accent)' : 'var(--border-input)',
                    }}>{active ? '✓' : ''}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start */}
          <button
            style={{
              ...styles.startBtn,
              opacity: canStart ? 1 : 0.4,
              cursor: canStart ? 'pointer' : 'not-allowed',
            }}
            onClick={() => canStart && startSession()}
            disabled={!canStart}
          >
            NEXT →
          </button>

          <div style={styles.footer}>
            <span>KEEP YOUR STREAK ALIVE.</span>
            <span>IT'S YOUR MOVE.</span>
          </div>
        </div>

        {showSheet && renderSheet()}
      </div>
    );
  }

  // ---------------- WORKOUT SCREEN ----------------
  const pct = Math.round((totalReps / target) * 100);
  const setsCompletedCount = scheme.sets ? state.setsDone.filter(Boolean).length : 0;

  return (
    <div style={styles.shell}>
      <style>{cssText}</style>
      <div style={{ ...styles.frame, animation: justFinished ? 'screenShake 0.6s cubic-bezier(.36,.07,.19,.97) 0.15s both' : 'none' }}>
        <div style={styles.headerRow}>
          <div>
            {state.user?.name && (
              <div style={styles.welcomeLine}>
                Welcome back, {state.user.name.split(' ')[0]}
              </div>
            )}
            <div
              style={{ ...styles.kicker, cursor: 'default', userSelect: 'none' }}
              onClick={handleKickerTap}
            >
              {state.adminMode ? '▪ ' : ''}DAILY 100 · {dateLabel.toUpperCase()}
            </div>
            <div style={styles.streakLine}>
              <span style={{
                ...styles.streakNum,
                animation: justFinished ? 'streakPulse 1.4s cubic-bezier(.36,.07,.19,.97) 0.4s 1' : 'none',
                display: 'inline-block',
              }}>{state.streak}</span>
              <span style={styles.streakLabel}>
                DAY{state.streak === 1 ? '' : 'S'}<br />STREAK
              </span>
            </div>
          </div>
          <button style={styles.menuBtn} onClick={() => { setShowSheet(true); setTab('log'); }}>MENU</button>
        </div>

        <div style={styles.divider} />

        {/* Session badges */}
        <div style={styles.sessionBadges}>
          <button style={styles.changeLink} onClick={changeWorkout}>← BACK</button>
          <div style={styles.badge}>{target} REPS</div>
          {state.equipment.map((eq) => {
            const opt = EQUIPMENT_OPTIONS.find((o) => o.id === eq);
            return <div key={eq} style={styles.badge}>{opt?.label}</div>;
          })}
        </div>

        <div style={styles.card}>
          <div style={styles.todayLabel}>TODAY'S MOVEMENT</div>
          <h1 style={styles.exerciseName}>{exercise.name}</h1>
          <div style={styles.tip}>{exercise.tip}</div>

          {priorRuns.length > 0 && (
            <div style={styles.priorRecap}>
              <div style={styles.priorRecapHeader}>
                <span style={styles.priorRecapCount}>
                  {priorRuns.length}×
                </span>
                <span style={styles.priorRecapLabel}>
                  You've done this {priorRuns.length === 1 ? 'once' : `${priorRuns.length} times`} before
                </span>
              </div>
              {lastRunWithNotes && (
                <div style={styles.priorRecapNoteBlock}>
                  <div style={styles.priorRecapNoteHeader}>
                    Last note · {new Date(lastRunWithNotes.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={styles.priorRecapNote}>"{lastRunWithNotes.notes}"</div>
                </div>
              )}
            </div>
          )}

          <a
            href={videoUrlFor(exercise)}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.howToLink}
          >
            HOW TO DO THIS MOVEMENT →
          </a>
        </div>

        <div style={styles.counterBlock}>
          <button style={styles.schemeBar} onClick={() => setShowSchemes((v) => !v)}>
            <div style={styles.schemeBarLeft}>
              <div style={styles.schemeLabel}>SET SCHEME</div>
              <div style={styles.schemeName}>{scheme.label}</div>
            </div>
            <div style={styles.schemeBarRight}>
              <div style={styles.schemeSub}>{scheme.short}</div>
              <div style={styles.schemeChevron}>{showSchemes ? '▴' : '▾'}</div>
            </div>
          </button>

          {showSchemes && (
            <div style={styles.schemeGrid}>
              {schemes.map((s) => {
                const active = s.id === scheme.id;
                const disabled = totalReps > 0 && !active;
                return (
                  <button
                    key={s.id}
                    style={{
                      ...styles.schemeChip,
                      background: active ? 'var(--text)' : 'var(--surface)',
                      color: active ? 'var(--bg-solid)' : 'var(--text)',
                      borderColor: active ? 'var(--text)' : 'var(--border)',
                      opacity: disabled ? 0.35 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                    }}
                    onClick={() => !disabled && pickScheme(s.id)}
                    disabled={disabled}
                  >
                    <div style={styles.schemeChipLabel}>{s.label}</div>
                    <div style={styles.schemeChipSub}>{s.short}</div>
                  </button>
                );
              })}
              {totalReps > 0 && (
                <div style={styles.schemeNote}>Reset progress to change scheme.</div>
              )}
            </div>
          )}

          {state.useTimer && state.workoutStarted && (() => {
            const acc = state.timerAccumulated || 0;
            const segment = state.timerStartedAt ? (tickNow - state.timerStartedAt) / 1000 : 0;
            const elapsed = Math.max(0, Math.floor(acc + segment));
            const isPaused = !state.timerStartedAt;
            return (
              <div style={styles.timerBlock}>
                <div style={styles.timerLabel}>
                  {isPaused ? 'PAUSED' : 'ELAPSED'}
                </div>
                <div style={{ ...styles.timerValue, opacity: isPaused ? 0.5 : 1 }}>
                  {formatDuration(elapsed)}
                </div>
                <div style={styles.timerControls}>
                  <button
                    style={styles.timerCtrlBtn}
                    onClick={isPaused ? resumeTimer : pauseTimer}
                  >
                    {isPaused ? '▶ RESUME' : '❚❚ PAUSE'}
                  </button>
                  <button
                    style={styles.timerCtrlBtn}
                    onClick={resetTimer}
                    disabled={elapsed === 0}
                  >
                    ↺ RESET
                  </button>
                </div>
              </div>
            );
          })()}

          <div style={styles.counterTop}>
            <div>
              <div style={styles.repsLabel}>
                REPS {scheme.sets && `· ${setsCompletedCount}/${scheme.sets.length} SETS`}
              </div>
              <div style={styles.repsValue}>
                <span style={{ color: done ? 'var(--accent)' : 'var(--text)' }}>{totalReps}</span>
                <span style={styles.repsTarget}>/{target}</span>
              </div>
            </div>
            <div style={styles.pctBox}><div style={styles.pctValue}>{pct}%</div></div>
          </div>

          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${pct}%`, background: done ? 'var(--accent-gradient)' : 'var(--text)' }} />
          </div>

          {done ? (
            <div style={styles.doneBlock}>
              <div style={styles.doneText}>DONE.</div>
              <button
                style={{
                  ...styles.startBtn,
                  marginBottom: 12,
                  fontSize: 22,
                  padding: '20px 0',
                }}
                onClick={startCooldown}
              >COOL DOWN →</button>
              <div style={{ ...styles.secondaryRow, marginBottom: 16 }}>
                <button
                  style={{
                    ...styles.ghostBtn,
                    fontSize: 11,
                    padding: '13px 0',
                    letterSpacing: 1.5,
                  }}
                  onClick={() => { setShowSheet(true); setTab('history'); }}
                >VIEW LOG</button>
                <button
                  style={{
                    ...styles.ghostBtn,
                    fontSize: 11,
                    padding: '13px 0',
                    letterSpacing: 1.5,
                  }}
                  onClick={skipCooldown}
                >SKIP COOLDOWN</button>
              </div>
              <button
                style={{
                  ...styles.ghostBtn,
                  fontSize: 13,
                  padding: '16px 28px',
                  letterSpacing: 1.8,
                }}
                onClick={undoCompletion}
              >RESET TODAY</button>
            </div>
          ) : !state.workoutStarted ? (
            <>
              <button
                style={{ ...styles.startBtn, marginBottom: 12 }}
                onClick={beginWorkout}
              >START →</button>
              <div style={styles.secondaryRow}>
                <button style={styles.ghostBtn} onClick={reset} disabled={true}>RESET</button>
                <button
                  style={styles.ghostBtn}
                  onClick={swap}
                  disabled={state.swapIndex >= 2}
                >
                  SWAP MOVE {state.swapIndex < 2 ? `(${2 - state.swapIndex} LEFT)` : '(0 LEFT)'}
                </button>
              </div>
            </>
          ) : scheme.sets ? (
            <>
              <div
                style={{
                  ...styles.setGrid,
                  gridTemplateColumns: `repeat(${
                    scheme.sets.length <= 4 ? scheme.sets.length :
                    scheme.sets.length <= 6 ? 3 : 5
                  }, 1fr)`,
                }}
              >
                {scheme.sets.map((reps, i) => {
                  const completed = !!state.setsDone[i];
                  const nextToDo = !completed && state.setsDone.slice(0, i).every(Boolean);
                  // Scale font with tile size — fewer tiles = bigger tiles = bigger number
                  const setCount = scheme.sets.length;
                  const numFontSize = setCount <= 2 ? 56 : setCount <= 4 ? 36 : setCount <= 6 ? 28 : 22;
                  const labelFontSize = setCount <= 2 ? 11 : setCount <= 4 ? 10 : 8;
                  return (
                    <button
                      key={i}
                      onClick={() => toggleSet(i)}
                      style={{
                        ...styles.setTile,
                        background: completed ? 'var(--accent-gradient)' : nextToDo ? 'var(--surface)' : 'var(--surface-muted)',
                        color: completed ? 'var(--surface)' : nextToDo ? 'var(--text)' : 'var(--dark-card-muted)',
                        borderColor: completed ? 'transparent' : nextToDo ? 'var(--text)' : 'var(--border)',
                        boxShadow: completed ? '0 3px 10px var(--accent-shadow-md)' : nextToDo ? '0 2px 8px var(--shadow-md)' : 'none',
                      }}
                    >
                      <div style={{ ...styles.setTileNum, fontSize: numFontSize }}>{reps}</div>
                      <div style={{ ...styles.setTileLabel, fontSize: labelFontSize }}>{completed ? '✓ DONE' : `SET ${i + 1}`}</div>
                    </button>
                  );
                })}
              </div>
              <div style={styles.secondaryRow}>
                <button style={styles.ghostBtn} onClick={reset} disabled={totalReps === 0}>RESET</button>
                <button
                  style={styles.ghostBtn}
                  onClick={swap}
                  disabled={totalReps > 0 || state.swapIndex >= 2}
                >
                  SWAP MOVE {state.swapIndex < 2 ? `(${2 - state.swapIndex} LEFT)` : '(0 LEFT)'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={styles.btnRow}>
                <button style={styles.repBtn} onClick={() => addReps(1)}>+1</button>
                <button style={styles.repBtn} onClick={() => addReps(5)}>+5</button>
                <button style={styles.repBtn} onClick={() => addReps(10)}>+10</button>
                <button style={styles.repBtn} onClick={() => addReps(25)}>+25</button>
              </div>
              <div style={styles.secondaryRow}>
                <button style={styles.ghostBtn} onClick={reset} disabled={state.reps === 0}>RESET</button>
                <button
                  style={styles.ghostBtn}
                  onClick={swap}
                  disabled={state.reps > 0 || state.swapIndex >= 2}
                >
                  SWAP MOVE {state.swapIndex < 2 ? `(${2 - state.swapIndex} LEFT)` : '(0 LEFT)'}
                </button>
              </div>
            </>
          )}
        </div>

        <div style={styles.footer}>
          <span>BREAK IT INTO SETS.</span>
          <span>YOU'VE GOT THIS.</span>
        </div>
      </div>

      {showTimerPrompt && (
        <div style={styles.timerPromptOverlay}>
          <div style={styles.timerPromptCard}>
            <div style={styles.timerPromptTitle}>TIME THIS WORKOUT?</div>
            <div style={styles.timerPromptSub}>Track how long it takes you.</div>
            <div style={styles.timerPromptButtons}>
              <button
                style={{ ...styles.ghostBtn, padding: '16px 0', fontSize: 14, letterSpacing: 1.8 }}
                onClick={() => chooseTimer(false)}
              >NO</button>
              <button
                style={{ ...styles.primaryBtn, padding: '16px 0', fontSize: 14, letterSpacing: 1.8 }}
                onClick={() => chooseTimer(true)}
              >YES</button>
            </div>
          </div>
        </div>
      )}

      {countdown !== null && (
        <div style={styles.countdownOverlay} onClick={skipCountdown}>
          <div
            key={String(countdown)}
            style={{
              ...styles.countdownNumber,
              ...(countdown === 'GO' ? styles.countdownGo : {}),
            }}
          >
            {countdown === 'GO' ? 'GO!' : countdown}
          </div>
          <div style={styles.countdownHint}>tap to skip</div>
        </div>
      )}

      {justFinished && (
        <>
          <div style={styles.flashBg} />
          <LightningBolts />
          <Fireworks />
          <div style={styles.flash}>
            <div style={styles.flashInner}>
              <div style={styles.flashDidIt}>YOU DID IT!</div>
              <div style={styles.flashBig}>{target}</div>
              <div style={styles.flashSub}>REPS COMPLETE</div>
            </div>
          </div>
        </>
      )}

      {cooldownCelebrate && (
        <div style={styles.cooldownCelebrate}>
          <div style={styles.cooldownCelebrateTitle}>AMAZING WORK<br />TODAY</div>
          <div style={styles.cooldownCelebrateSub}>SEE YOU<br />TOMORROW</div>
        </div>
      )}

      {showSheet && renderSheet()}
    </div>
  );

  // ---------------- SHEET (shared between home + workout) ----------------
  function renderSheet() {
    const activeBuiltinCount = BUILTIN_EXERCISES.length - state.disabledBuiltins.length;
    return (
      <div style={styles.sheetOverlay} onClick={() => { setShowSheet(false); setExpandedNote(null); }}>
        <div className="sheet-sized" style={styles.sheet} onClick={(e) => e.stopPropagation()}>
          <div style={styles.sheetHeader}>
            <div style={styles.tabs}>
              <button
                style={{ ...styles.tab, ...(tab === 'log' ? styles.tabActive : {}) }}
                onClick={() => setTab('log')}
              >LOG</button>
              <button
                style={{ ...styles.tab, ...(tab === 'history' ? styles.tabActive : {}) }}
                onClick={() => setTab('history')}
              >HISTORY</button>
              <button
                style={{ ...styles.tab, ...(tab === 'friends' ? styles.tabActive : {}) }}
                onClick={() => setTab('friends')}
              >
                FRIENDS
                {state.incomingRequests.length > 0 && (
                  <span style={styles.tabBadge}>{state.incomingRequests.length}</span>
                )}
              </button>
              {state.adminMode && (
                <button
                  style={{ ...styles.tab, ...(tab === 'moves' ? styles.tabActive : {}) }}
                  onClick={() => setTab('moves')}
                >MOVES</button>
              )}
            </div>
            <button style={styles.iconBtn} onClick={() => { setShowSheet(false); setExpandedNote(null); }}>✕</button>
          </div>

          {tab === 'log' && (
            <>
              <div style={styles.sheetStats}>
                <div>
                  <div style={styles.statNum}>{state.streak}</div>
                  <div style={styles.statLabel}>STREAK</div>
                </div>
                <div>
                  <div style={styles.statNum}>{state.history.filter((h) => h.completed).length}</div>
                  <div style={styles.statLabel}>TOTAL DAYS</div>
                </div>
                <div>
                  <div style={styles.statNum}>
                    {state.history.reduce((sum, h) => sum + (h.reps || 0), 0) +
                      (state.sessionStarted && !done ? totalReps : 0)}
                  </div>
                  <div style={styles.statLabel}>TOTAL REPS</div>
                </div>
              </div>

              {(() => {
                const medals = computeEarnedMedals(state);
                const earnedCount = medals.filter((m) => m.earned).length;
                return (
                  <>
                    <div style={styles.sectionHeader}>
                      <span>MEDALS EARNED</span>
                    </div>
                    <div style={styles.medalGrid}>
                      {medals.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            ...styles.medal,
                            background: m.earned ? 'var(--accent-gradient)' : 'var(--surface)',
                            color: m.earned ? 'var(--surface)' : 'var(--text)',
                            borderColor: m.earned ? 'transparent' : 'var(--border)',
                            boxShadow: m.earned ? '0 3px 12px var(--accent-shadow-sm)' : 'none',
                            opacity: m.earned ? 1 : 0.65,
                          }}
                        >
                          <div style={{
                            ...styles.medalIcon,
                            background: m.earned ? 'rgba(255,255,255,0.22)' : 'var(--medal-icon-bg)',
                            color: m.earned ? 'var(--surface)' : 'var(--text-subtle)',
                          }}>
                            {m.earned ? '★' : '☆'}
                          </div>
                          <div style={styles.medalBody}>
                            <div style={styles.medalLabel}>{m.label}</div>
                            <div style={{
                              ...styles.medalSub,
                              color: m.earned ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
                            }}>
                              {m.earned
                                ? m.sub
                                : `${Math.floor(m.progress * m.threshold)}/${m.threshold} ${m.type === 'days' ? 'days' : 'days'}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}

              <div style={styles.accountBlock}>
                <div style={styles.accountInfo}>
                  <div style={styles.accountName}>{state.user.name}</div>
                  <div style={styles.accountEmail}>
                    {state.user.email} · {state.user.provider.toUpperCase()}
                  </div>
                </div>
                <div style={styles.accountActions}>
                  <button
                    style={styles.ghostBtn}
                    onClick={resetStreak}
                    disabled={state.streak === 0}
                  >RESET STREAK</button>
                  <button style={styles.ghostBtn} onClick={signOut}>SIGN OUT</button>
                </div>
              </div>
            </>
          )}

          {tab === 'history' && (
            <>
              <div style={styles.historyHeader}>
                <div style={styles.historyTitle}>EXERCISE HISTORY</div>
                <div style={styles.historySubtitle}>
                  {state.history.length === 0
                    ? 'No completed workouts yet'
                    : `${state.history.length} completed workout${state.history.length === 1 ? '' : 's'} · tap any to add notes`}
                </div>
              </div>
              {state.history.length > 0 && (
                <div style={styles.historySortRow}>
                  {[
                    { id: 'newest', label: 'NEWEST' },
                    { id: 'oldest', label: 'OLDEST' },
                    { id: 'alpha', label: 'A–Z' },
                  ].map((opt) => {
                    const active = historySort === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setHistorySort(opt.id)}
                        style={{
                          ...styles.historySortBtn,
                          background: active ? 'var(--text)' : 'var(--surface)',
                          color: active ? 'var(--bg-solid)' : 'var(--text)',
                          borderColor: active ? 'var(--text)' : 'var(--border)',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={styles.historyList}>
                {state.history.length === 0 && (
                  <div style={styles.emptyHistory}>Finish today to start your log.</div>
                )}
                {sortedHistory.map((h) => (
                  <button
                    key={h.date}
                    onClick={() => setExpandedNote(h.date)}
                    style={styles.historyRow}
                  >
                    <div style={styles.historyDate}>
                      {new Date(h.date + 'T00:00:00').toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric',
                      })}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.historyEx}>{h.exercise}</div>
                      <div style={styles.historyScheme}>
                        {h.scheme}{h.equipment ? ` · ${h.equipment.join(' / ')}` : ''}
                        {h.duration != null && (
                          <span style={styles.historyDuration}> · {formatDuration(h.duration)}</span>
                        )}
                      </div>
                      {h.notes && (
                        <div style={styles.historyNotePreview}>"{h.notes}"</div>
                      )}
                    </div>
                    <div style={styles.historyReps}>{h.reps}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {tab === 'friends' && (() => {
            const friendsWithSelf = [
              { id: 'me', name: 'You', handle: '@you', streak: state.streak, isMe: true },
              ...state.friends,
            ];
            const leaderboard = [...friendsWithSelf].sort((a, b) => b.streak - a.streak);
            const filteredSuggestions = state.suggestions.filter(
              (p) =>
                !findQuery ||
                p.name.toLowerCase().includes(findQuery.toLowerCase()) ||
                p.handle.toLowerCase().includes(findQuery.toLowerCase())
            );

            return (
              <>
                <div style={styles.subtabRow}>
                  {['friends', 'squads', 'requests', 'find'].map((v) => {
                    const labels = { friends: 'FRIENDS', requests: 'REQUESTS', find: 'FIND', squads: 'SQUADS' };
                    const active = friendsView === v;
                    const count = v === 'requests' ? state.incomingRequests.length : 0;
                    return (
                      <button
                        key={v}
                        style={{
                          ...styles.subtab,
                          background: active ? 'var(--text)' : 'var(--surface)',
                          color: active ? 'var(--bg-solid)' : 'var(--text)',
                          borderColor: active ? 'var(--text)' : 'var(--border)',
                        }}
                        onClick={() => setFriendsView(v)}
                      >
                        {labels[v]}
                        {count > 0 && <span style={styles.subtabBadge}>{count}</span>}
                      </button>
                    );
                  })}
                </div>

                {friendsView === 'friends' && (
                  <>
                    {state.friends.length === 0 ? (
                      <div style={styles.emptyFriends}>
                        No friends yet. Tap FIND to add some.
                      </div>
                    ) : (
                      <>
                        <div style={styles.movesHeader}>STREAK LEADERBOARD</div>
                        {leaderboard.map((p, i) => (
                          <div key={p.id} style={{
                            ...styles.leaderRow,
                            background: p.isMe ? 'var(--surface)' : 'transparent',
                          }}>
                            <div style={styles.leaderRank}>{i + 1}</div>
                            <div style={styles.leaderBody}>
                              <div style={styles.leaderName}>
                                {p.name}{p.isMe && ' (you)'}
                              </div>
                              <div style={styles.leaderHandle}>{p.handle}</div>
                            </div>
                            <div style={styles.leaderStreak}>
                              <span style={styles.leaderStreakNum}>{p.streak}</span>
                              <span style={styles.leaderStreakLabel}>DAYS</span>
                            </div>
                            {!p.isMe && (
                              <button
                                onClick={() => removeFriend(p.id)}
                                style={styles.smallGhostBtn}
                                title="Remove friend"
                              >✕</button>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </>
                )}

                {friendsView === 'requests' && (
                  <>
                    <div style={styles.movesHeader}>
                      INCOMING · {state.incomingRequests.length}
                    </div>
                    {state.incomingRequests.length === 0 ? (
                      <div style={styles.emptyFriends}>No incoming requests.</div>
                    ) : (
                      state.incomingRequests.map((p) => (
                        <div key={p.id} style={styles.requestRow}>
                          <div style={styles.leaderBody}>
                            <div style={styles.leaderName}>{p.name}</div>
                            <div style={styles.leaderHandle}>{p.handle} · {p.streak}-day streak</div>
                          </div>
                          <button
                            style={styles.acceptBtn}
                            onClick={() => acceptRequest(p.id)}
                          >ACCEPT</button>
                          <button
                            style={styles.declineBtn}
                            onClick={() => declineRequest(p.id)}
                          >✕</button>
                        </div>
                      ))
                    )}

                    <div style={styles.movesHeader}>
                      SENT · {state.outgoingRequests.length}
                    </div>
                    {state.outgoingRequests.length === 0 ? (
                      <div style={styles.emptyFriends}>No outgoing requests.</div>
                    ) : (
                      state.outgoingRequests.map((p) => (
                        <div key={p.id} style={styles.requestRow}>
                          <div style={styles.leaderBody}>
                            <div style={styles.leaderName}>{p.name}</div>
                            <div style={styles.leaderHandle}>{p.handle} · awaiting reply</div>
                          </div>
                          <button
                            style={styles.smallGhostBtn}
                            onClick={() => cancelOutgoing(p.id)}
                          >CANCEL</button>
                        </div>
                      ))
                    )}
                  </>
                )}

                {friendsView === 'find' && (
                  <>
                    <input
                      placeholder="Search by name or @handle"
                      value={findQuery}
                      onChange={(e) => setFindQuery(e.target.value)}
                      style={{ ...styles.authInput, marginBottom: 16, background: 'var(--surface)' }}
                    />
                    <div style={styles.movesHeader}>SUGGESTED FOR YOU</div>
                    {filteredSuggestions.length === 0 ? (
                      <div style={styles.emptyFriends}>No matches.</div>
                    ) : (
                      filteredSuggestions.map((p) => (
                        <div key={p.id} style={styles.requestRow}>
                          <div style={styles.leaderBody}>
                            <div style={styles.leaderName}>{p.name}</div>
                            <div style={styles.leaderHandle}>{p.handle} · {p.streak}-day streak</div>
                          </div>
                          <button
                            style={styles.acceptBtn}
                            onClick={() => sendFriendRequest(p)}
                          >+ ADD</button>
                        </div>
                      ))
                    )}
                  </>
                )}

                {friendsView === 'squads' && (() => {
                  const uid = fbUidRef.current;

                  // ---- DETAIL VIEW ----
                  if (squadView === 'detail' && activeSquad) {
                    const sq = squads.find((s) => s.id === activeSquad.id) || activeSquad;
                    const completedToday = sq.completedTodayDate === TODAY() ? (sq.completedToday || []) : [];
                    const memberUids = sq.memberUids || [];
                    const memberNames = sq.memberNames || {};
                    const myDone = completedToday.includes(uid);
                    return (
                      <>
                        <button style={styles.backLink} onClick={() => { setSquadView('list'); setActiveSquad(null); }}>← BACK TO SQUAD LIST</button>
                        <div style={styles.squadDetailCard}>
                          <div style={styles.squadDetailName}>{sq.name}</div>
                          <div style={styles.squadDetailStreakRow}>
                            <div style={styles.squadDetailStreakBlock}>
                              <div style={styles.squadDetailStreakNum}>{sq.streak || 0}</div>
                              <div style={styles.squadDetailStreakLabel}>DAY{(sq.streak || 0) === 1 ? '' : 'S'}<br />SQUAD STREAK</div>
                            </div>
                            <div style={styles.squadDetailStreakBlock}>
                              <div style={styles.squadDetailStreakNum}>{sq.bestStreak || 0}</div>
                              <div style={styles.squadDetailStreakLabel}>BEST<br />EVER</div>
                            </div>
                            <div style={styles.squadDetailStreakBlock}>
                              <div style={styles.squadDetailStreakNum}>{sq.saves || 0}</div>
                              <div style={styles.squadDetailStreakLabel}>SAVES<br />BANKED</div>
                            </div>
                          </div>
                          <div style={styles.squadDetailRule}>
                            <div>· 50% of squad members must complete to continue streak</div>
                            <div>· 7 consecutive days earns a streak save</div>
                            <div>· 5 saves max</div>
                          </div>
                        </div>

                        <div style={styles.movesHeader}>TODAY · {completedToday.length}/{memberUids.length} DONE</div>
                        {memberUids.map((mid) => {
                          const name = memberNames[mid] || 'Member';
                          const memberDone = completedToday.includes(mid);
                          const memberExercise = memberDone ? (sq.memberExercises?.[mid] || null) : null;
                          const isMe = mid === uid;
                          return (
                            <div key={mid}>
                              <div style={{ ...styles.squadMemberRow2, background: isMe ? 'var(--surface)' : 'transparent', marginBottom: memberDone ? 2 : 6 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <div style={styles.squadMemberName2}>{name}{isMe ? ' (you)' : ''}</div>
                                  {memberExercise && (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{memberExercise}</div>
                                  )}
                                </div>
                                <div style={{ ...styles.squadMemberBadge, background: memberDone ? 'var(--accent)' : 'var(--border)', color: memberDone ? '#fff' : 'var(--text-muted)' }}>
                                  {memberDone ? '✓ DONE' : '⏳ YET'}
                                </div>
                              </div>
                              {memberDone && !isMe && (
                                <div style={styles.reactionRow}>
                                  {EMOJI_REACTIONS.map(({ key, emoji }) => {
                                    const rk = `${TODAY()}__${mid}__${key}`;
                                    const reactors = squadReactions[sq.id]?.[rk] || [];
                                    const iReacted = reactors.includes(uid);
                                    return (
                                      <button
                                        key={key}
                                        onClick={() => toggleReaction(sq.id, mid, key)}
                                        style={{
                                          ...styles.reactionBtn,
                                          background: iReacted ? 'var(--accent-gradient)' : 'var(--surface)',
                                          color: iReacted ? '#fff' : 'var(--text)',
                                          borderColor: iReacted ? 'transparent' : 'var(--border)',
                                        }}
                                      >
                                        {emoji}
                                        {reactors.length > 0 && <span style={styles.reactionCount}>{reactors.length}</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                              {memberDone && isMe && (() => {
                                const chips = EMOJI_REACTIONS.filter(({ key }) => (squadReactions[sq.id]?.[`${TODAY()}__${mid}__${key}`] || []).length > 0);
                                return chips.length > 0 ? (
                                  <div style={styles.reactionRow}>
                                    {chips.map(({ key, emoji }) => {
                                      const cnt = (squadReactions[sq.id]?.[`${TODAY()}__${mid}__${key}`] || []).length;
                                      return (
                                        <div key={key} style={styles.reactionChip}>
                                          {emoji} <span style={styles.reactionCount}>{cnt}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          );
                        })}

                        <div style={styles.squadCodeBlock}>
                          <div style={styles.squadCodeLabel}>INVITE CODE</div>
                          <div style={styles.squadCodeValue}>{sq.joinCode}</div>
                          <div style={styles.squadCodeHint}>Share this code for others to join your squad</div>
                          <div style={styles.squadCodeHint}>Squads are capped at 4 members</div>
                        </div>

                        <button
                          style={{ ...styles.ghostBtn, marginTop: 8, fontSize: 10, letterSpacing: 1.2, background: '#000', color: '#fff', borderColor: '#000', width: '100%', textAlign: 'center', opacity: squadBusy ? 0.5 : 1 }}
                          onClick={() => leaveSquad(sq.id)}
                          disabled={squadBusy}
                        >LEAVE SQUAD</button>
                      </>
                    );
                  }

                  // ---- CREATE VIEW ----
                  if (squadView === 'create') {
                    return (
                      <>
                        <button style={styles.backLink} onClick={() => { setSquadView('list'); setSquadError(''); }}>← BACK TO SQUAD LIST</button>
                        <div style={styles.movesHeader}>NEW SQUAD</div>
                        {squadError && <div style={styles.authErrorText}>{squadError}</div>}
                        <div style={styles.formLabel}>SQUAD NAME</div>
                        <input
                          placeholder="Morning Crew"
                          value={newSquadName}
                          onChange={(e) => setNewSquadName(e.target.value)}
                          style={{ ...styles.authInput, marginBottom: 20 }}
                          maxLength={30}
                          autoFocus
                        />
                        <div style={styles.formButtons}>
                          <button style={styles.ghostBtn} onClick={() => { setSquadView('list'); setSquadError(''); }}>CANCEL</button>
                          <button
                            style={{ ...styles.primaryBtn, opacity: squadBusy ? 0.6 : 1 }}
                            onClick={createSquad}
                            disabled={squadBusy}
                          >{squadBusy ? 'CREATING…' : 'CREATE SQUAD'}</button>
                        </div>
                        <div style={{ ...styles.helpText, marginTop: 16 }}>
                          A 6-character invite code is generated automatically. Share it with up to 3 others to build your squad.
                        </div>
                      </>
                    );
                  }

                  // ---- JOIN VIEW ----
                  if (squadView === 'join') {
                    return (
                      <>
                        <button style={styles.backLink} onClick={() => { setSquadView('list'); setSquadError(''); }}>← BACK TO SQUAD LIST</button>
                        <div style={styles.movesHeader}>JOIN A SQUAD</div>
                        {squadError && <div style={styles.authErrorText}>{squadError}</div>}
                        <div style={styles.formLabel}>6-CHARACTER CODE</div>
                        <input
                          placeholder="ABC123"
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                          style={{ ...styles.authInput, letterSpacing: 4, fontSize: 20, textAlign: 'center', marginBottom: 20 }}
                          maxLength={6}
                          autoFocus
                          autoCapitalize="characters"
                        />
                        <div style={styles.formButtons}>
                          <button style={styles.ghostBtn} onClick={() => { setSquadView('list'); setSquadError(''); }}>CANCEL</button>
                          <button
                            style={{ ...styles.primaryBtn, opacity: squadBusy ? 0.6 : 1 }}
                            onClick={joinSquad}
                            disabled={squadBusy}
                          >{squadBusy ? 'JOINING…' : 'JOIN SQUAD'}</button>
                        </div>
                      </>
                    );
                  }

                  // ---- LIST VIEW (default) ----
                  return (
                    <>
                      {squads.length < 3 && (
                        <div style={styles.squadActionRow}>
                          <button
                            style={styles.squadActionBtn}
                            onClick={() => { setSquadView('create'); setSquadError(''); setNewSquadName(''); }}
                          >+ CREATE SQUAD</button>
                          <button
                            style={styles.squadActionBtn}
                            onClick={() => { setSquadView('join'); setSquadError(''); setJoinCodeInput(''); }}
                          >↗ JOIN SQUAD</button>
                        </div>
                      )}
                      {squadsLoading && <div style={styles.emptyFriends}>Loading squads…</div>}
                      {!squadsLoading && squads.length === 0 && (
                        <div style={styles.emptyFriends}>
                          No squads yet. Create one or join with a code.
                        </div>
                      )}
                      {squads.map((sq) => {
                        const completedToday = sq.completedTodayDate === TODAY() ? (sq.completedToday || []) : [];
                        const memberCount = sq.memberUids?.length || 1;
                        const threshold = Math.ceil(memberCount * 0.5);
                        const onTrack = completedToday.length >= threshold;
                        const myDone = completedToday.includes(uid);
                        return (
                          <button
                            key={sq.id}
                            style={styles.squadCard}
                            onClick={() => { setActiveSquad(sq); setSquadView('detail'); }}
                          >
                            <div style={styles.squadCardTop}>
                              <div style={styles.squadName}>{sq.name}</div>
                              <div style={{ ...styles.squadStatusChip, background: onTrack ? 'rgba(60,180,100,0.15)' : 'var(--surface)', color: onTrack ? '#3cb464' : 'var(--text-muted)' }}>
                                {onTrack ? '✓ ON TRACK' : `${completedToday.length}/${memberCount} TODAY`}
                              </div>
                            </div>
                            <div style={styles.squadCardBottom}>
                              <div style={styles.squadStreakMini}>
                                <span style={styles.squadStreakMiniNum}>{sq.streak || 0}</span>
                                <span style={styles.squadStreakMiniLabel}> DAY STREAK</span>
                              </div>
                              {(sq.saves || 0) > 0 && (
                                <div style={styles.squadSaveChip}>🛡 {sq.saves} SAVE{sq.saves > 1 ? 'S' : ''}</div>
                              )}
                              <div style={{ ...styles.squadMyStatus, color: myDone ? '#3cb464' : 'var(--text-muted)' }}>
                                {myDone ? 'YOU ✓' : 'YOU ⏳'}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {squads.length >= 3 && (
                        <div style={styles.helpText}>You're in the maximum of 3 squads.</div>
                      )}
                    </>
                  );
                })()}
              </>
            );
          })()}

          {tab === 'moves' && state.adminMode && (
            <>
              {!addingMove ? (
                <button style={styles.bigAddBtn} onClick={openAddForm}>+ NEW MOVE</button>
              ) : (
                <div style={styles.addForm}>
                  <div style={styles.formLabel}>NAME</div>
                  <input
                    placeholder="BURPEES"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value.toUpperCase())}
                    style={{ ...styles.nameInput, width: '100%', marginBottom: 14 }}
                    maxLength={28}
                  />
                  <div style={styles.formLabel}>EQUIPMENT</div>
                  <div style={styles.formEquipRow}>
                    {EQUIPMENT_OPTIONS.map((eq) => {
                      const active = newEquipment.includes(eq.id);
                      return (
                        <button
                          key={eq.id}
                          style={{
                            ...styles.formEquipChip,
                            background: active ? 'var(--text)' : 'var(--bg-solid)',
                            color: active ? 'var(--bg-solid)' : 'var(--text)',
                            borderColor: active ? 'var(--text)' : 'var(--border)',
                          }}
                          onClick={() => toggleNewEquipment(eq.id)}
                        >
                          {eq.label}
                        </button>
                      );
                    })}
                  </div>
                  <div style={styles.formLabel}>FORM TIP (OPTIONAL)</div>
                  <input
                    placeholder="e.g. Explode up. Land soft."
                    value={newTip}
                    onChange={(e) => setNewTip(e.target.value)}
                    style={styles.tipInput}
                    maxLength={80}
                  />
                  <div style={styles.formLabel}>VIDEO URL (OPTIONAL)</div>
                  <input
                    placeholder="https://youtube.com/watch?v=..."
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    style={styles.tipInput}
                    maxLength={500}
                  />
                  <div style={styles.formHelp}>
                    Leave blank to auto-link to a YouTube search.
                  </div>
                  {addError && <div style={styles.errorText}>{addError}</div>}
                  <div style={styles.formButtons}>
                    <button style={styles.ghostBtn} onClick={cancelAdd}>CANCEL</button>
                    <button style={styles.primaryBtn} onClick={saveMove}>ADD MOVE</button>
                  </div>
                </div>
              )}

              <div style={styles.movesHeader}>MY MOVES · {state.customExercises.length}</div>
              {state.customExercises.length === 0 ? (
                <div style={styles.emptyMoves}>Tap + NEW MOVE to add your own.</div>
              ) : (
                state.customExercises.map((ex) => (
                  <div key={ex.name} style={styles.moveRow}>
                    <div style={styles.moveBody}>
                      <div style={styles.moveName}>{ex.name}</div>
                      <div style={styles.moveMeta}>
                        {(ex.equipment || ['bodyweight']).map((id) => {
                          const opt = EQUIPMENT_OPTIONS.find((o) => o.id === id);
                          return opt ? opt.label : '';
                        }).filter(Boolean).join(' · ')}
                        {ex.tip && ` — ${ex.tip}`}
                      </div>
                    </div>
                    <button onClick={() => deleteCustom(ex.name)} style={styles.deleteBtn}>✕</button>
                  </div>
                ))
              )}

              <div style={styles.movesHeader}>
                BUILT-IN · {activeBuiltinCount}/{BUILTIN_EXERCISES.length} ON
              </div>
              {BUILTIN_EXERCISES.map((ex) => {
                const isOff = state.disabledBuiltins.includes(ex.name);
                return (
                  <div key={ex.name} style={styles.moveRow}>
                    <div style={{ ...styles.moveBody, opacity: isOff ? 0.4 : 1 }}>
                      <div style={{
                        ...styles.moveName,
                        textDecoration: isOff ? 'line-through' : 'none',
                      }}>{ex.name}</div>
                      <div style={styles.moveMeta}>
                        {ex.equipment.map((id) => {
                          const opt = EQUIPMENT_OPTIONS.find((o) => o.id === id);
                          return opt ? opt.label : '';
                        }).filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleBuiltin(ex.name)}
                      style={{
                        ...styles.toggleBtn,
                        background: isOff ? 'var(--surface)' : 'var(--text)',
                        color: isOff ? 'var(--text-muted)' : 'var(--surface)',
                        borderColor: isOff ? 'var(--border)' : 'var(--text)',
                      }}
                    >{isOff ? 'OFF' : 'ON'}</button>
                  </div>
                );
              })}

              <div style={styles.adminFooter}>
                <button
                  style={styles.ghostBtn}
                  onClick={() => {
                    setState({ ...state, adminMode: false });
                    setTab('log');
                  }}
                >LOCK ADMIN</button>
              </div>
            </>
          )}
        </div>

        {expandedNote && (() => {
          const entry = state.history.find((h) => h.date === expandedNote);
          if (!entry) return null;
          return (
            <div
              style={styles.notePopupOverlay}
              onClick={(e) => {
                // Only close when the backdrop itself is tapped, not when a tap
                // bubbles up from the card/textarea (which breaks typing on mobile).
                if (e.target === e.currentTarget) setExpandedNote(null);
              }}
            >
              <div
                style={styles.notePopupCard}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <div style={styles.notePopupTitle}>{entry.exercise}</div>
                <div style={styles.notePopupMeta}>
                  {new Date(entry.date + 'T00:00:00').toLocaleDateString(undefined, {
                    month: 'long', day: 'numeric',
                  })}
                  {' · '}{entry.reps} reps
                  {entry.duration != null && ` · ${formatDuration(entry.duration)}`}
                </div>
                <div style={styles.notePopupLabel}>NOTES</div>
                <textarea
                  value={entry.notes || ''}
                  onChange={(e) => updateHistoryNote(entry.date, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Weight used, how it felt, modifications..."
                  style={styles.notePopupTextarea}
                  autoFocus
                  rows={5}
                />
                <button
                  onClick={() => setExpandedNote(null)}
                  style={styles.notePopupDoneBtn}
                >DONE</button>
              </div>
            </div>
          );
        })()}

      </div>
    );
  }
}

const cssText = `
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --bg: linear-gradient(180deg, #faf6f0 0%, #f4ede4 100%);
  --bg-solid: #faf6f0;
  --text: #1a1a1a;
  --text-muted: #8a8178;
  --text-subtle: #c0b6a8;
  --text-faint: #b5aca2;
  --surface: #ffffff;
  --surface-muted: #f7f2ea;
  --surface-input: #faf6f0;
  --border: #e0d6c8;
  --border-soft: #e8e0d4;
  --border-input: #d0c6b8;
  --divider: #e0d6c8;
  --accent: #e8442f;
  --accent-light: #f25138;
  --accent-hilite: #ff6b54;
  --accent-gradient: linear-gradient(135deg, #f25138 0%, #e8442f 100%);
  --accent-shadow-sm: rgba(232,68,47,0.25);
  --accent-shadow-md: rgba(232,68,47,0.30);
  --accent-shadow-lg: rgba(232,68,47,0.35);
  --gold: #ffd700;
  --dark-card-bg: linear-gradient(160deg, #2a2a2a 0%, #161616 100%);
  --dark-card-text: #faf6f0;
  --dark-card-muted: #b5aca2;
  --dark-card-border: rgba(255,255,255,0.12);
  --dark-card-accent: #ff6b54;
  --shadow-xs: rgba(0,0,0,0.05);
  --shadow-sm: rgba(0,0,0,0.06);
  --shadow-md: rgba(0,0,0,0.08);
  --shadow-lg: rgba(0,0,0,0.18);
  --shadow-charcoal: rgba(26,26,26,0.25);
  --overlay: rgba(20,16,12,0.55);
  --countdown-overlay: rgba(15,12,10,0.85);
  --progress-track: #efe7da;
  --medal-icon-bg: #f2ebe0;
  --target-faint: #cfc6ba;
  --equip-check-empty: #d0c6b8;
  --scrollbar: rgba(0,0,0,0.15);
}

html { background: var(--bg-solid); }
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
@keyframes flashIn {
  0% { opacity: 0; transform: scale(0.85); }
  12% { opacity: 1; transform: scale(1.03); }
  75% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.98); }
}
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes revealNameIn {
  0% { opacity: 0; transform: translateY(8px) scale(0.94); }
  60% { opacity: 1; }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes revealLandedPop {
  0% { transform: scale(0.85); opacity: 0.7; }
  45% { transform: scale(1.22); opacity: 1; }
  80% { transform: scale(1.04); }
  100% { transform: scale(1.1); }
}
@keyframes revealFlash {
  0% { box-shadow: 0 0 0 0 rgba(232, 68, 47, 0); }
  35% { box-shadow: 0 0 220px 80px rgba(232, 68, 47, 0.5) inset; }
  100% { box-shadow: 0 0 0 0 rgba(232, 68, 47, 0); }
}
@keyframes pulse { 0%, 100% { opacity: 0.4; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.1); } }
@keyframes screenShake {
  0%, 100% { transform: translate3d(0, 0, 0); }
  10% { transform: translate3d(-8px, 2px, 0); }
  20% { transform: translate3d(7px, -3px, 0); }
  30% { transform: translate3d(-6px, 4px, 0); }
  40% { transform: translate3d(5px, -2px, 0); }
  50% { transform: translate3d(-4px, 3px, 0); }
  60% { transform: translate3d(3px, -2px, 0); }
  70% { transform: translate3d(-2px, 1px, 0); }
  80% { transform: translate3d(2px, -1px, 0); }
  90% { transform: translate3d(-1px, 0, 0); }
}
@keyframes boltFlash {
  0% { opacity: 0; transform: rotate(var(--rot, 0deg)) scaleY(0.2); }
  10% { opacity: 1; transform: rotate(var(--rot, 0deg)) scaleY(1); }
  40% { opacity: 1; }
  100% { opacity: 0; transform: rotate(var(--rot, 0deg)) scaleY(1); }
}
@keyframes whiteFlash {
  0% { opacity: 0; }
  30% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes streakPulse {
  0% { transform: scale(1); }
  30% { transform: scale(1.6); color: #ffd700; }
  100% { transform: scale(1); }
}
@keyframes countdownTick {
  0% { opacity: 0; transform: scale(1.8); }
  15% { opacity: 1; transform: scale(1); }
  85% { opacity: 1; transform: scale(0.95); }
  100% { opacity: 0; transform: scale(0.6); }
}
@keyframes countdownGoIn {
  0% { opacity: 0; transform: scale(0.4) rotate(-6deg); }
  40% { opacity: 1; transform: scale(1.2) rotate(2deg); }
  70% { transform: scale(1) rotate(0); }
  100% { opacity: 1; transform: scale(1) rotate(0); }
}
@keyframes flashBgIn {
  0% { opacity: 0; }
  10% { opacity: 1; }
  85% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes cooldownBgIn {
  0% { opacity: 0; }
  15% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes cooldownTitleFade {
  0% { opacity: 0; transform: translateY(8px); }
  12% { opacity: 1; transform: translateY(0); }
  38% { opacity: 1; transform: translateY(0); }
  50% { opacity: 0; transform: translateY(-8px); }
  100% { opacity: 0; transform: translateY(-8px); }
}
@keyframes cooldownSubFade {
  0% { opacity: 0; transform: translateY(8px); }
  50% { opacity: 0; transform: translateY(8px); }
  62% { opacity: 1; transform: translateY(0); }
  88% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(0); }
}
button { transition: transform 0.08s ease, box-shadow 0.15s ease, background 0.15s ease, opacity 0.15s ease, color 0.15s ease; }
button:active { transform: scale(0.98); }
button:disabled { cursor: not-allowed; }
input { font-family: inherit; transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease; }
input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(232,68,47,0.15); }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: var(--scrollbar); border-radius: 4px; }
input, textarea { color: var(--text); -webkit-text-fill-color: var(--text); caret-color: var(--accent); }
input::placeholder, textarea::placeholder { color: var(--text-muted); opacity: 1; }
input::-webkit-input-placeholder, textarea::-webkit-input-placeholder { color: var(--text-muted); opacity: 1; }
@supports (height: 100dvh) {
  .sheet-sized { min-height: 75dvh !important; max-height: 88dvh !important; }
}
`;

const styles = {
  shell: {
    minHeight: '100vh',
    background: 'var(--bg)',
    fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--text)',
    padding: '24px 18px 48px',
  },
  frame: { maxWidth: 480, margin: '0 auto' },

  // Daily reveal slot machine
  revealOverlay: { position: 'fixed', inset: 0, background: 'radial-gradient(circle at center, rgba(232, 68, 47, 0.10) 0%, var(--bg-solid) 60%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 24, cursor: 'pointer', animation: 'fadeIn 0.35s ease', WebkitTapHighlightColor: 'transparent' },
  revealOverlayLanded: { background: 'radial-gradient(circle at center, rgba(232, 68, 47, 0.32) 0%, var(--bg-solid) 70%)', animation: 'revealFlash 0.6s ease-out' },
  revealInner: { textAlign: 'center', maxWidth: 480, width: '100%', padding: '0 8px' },
  revealLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 3, fontWeight: 700, color: 'var(--accent)', marginBottom: 36, opacity: 0.9 },
  revealName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 'clamp(36px, 9vw, 60px)', lineHeight: 0.95, letterSpacing: -1.2, color: 'var(--text)', marginBottom: 28, minHeight: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'revealNameIn 0.12s ease-out', padding: '0 4px', wordBreak: 'break-word' },
  revealNameLanded: { color: 'var(--accent)', animation: 'revealLandedPop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)', textShadow: '0 0 36px rgba(232, 68, 47, 0.45)' },
  revealEquipChip: { display: 'inline-block', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1.8, fontWeight: 700, color: 'var(--text-muted)', padding: '7px 16px', border: '1.5px solid var(--border)', borderRadius: 999, marginBottom: 44 },
  revealSkipHint: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: 'var(--text-muted)', opacity: 0.45, fontWeight: 700 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  kicker: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.8, color: 'var(--text-muted)', marginBottom: 14, fontWeight: 700 },
  welcomeLine: { fontFamily: "'Archivo Black', sans-serif", fontSize: 16, letterSpacing: -0.3, color: 'var(--text)', marginBottom: 6, lineHeight: 1.1 },
  streakLine: { display: 'flex', alignItems: 'center', gap: 11 },
  streakNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 54, lineHeight: 0.85, color: 'var(--accent)' },
  streakLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.15 },
  iconBtn: { width: 42, height: 42, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 18, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)', borderRadius: 12, boxShadow: '0 1px 3px var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  menuBtn: { height: 42, padding: '0 14px', border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)', borderRadius: 12, boxShadow: '0 1px 3px var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, background: 'var(--border)', margin: '4px 0 24px' },

  // Warmup bar (on home screen)
  warmupBar: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 14, marginBottom: 22, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 1px 3px var(--shadow-sm)' },
  warmupQuestion: { fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  warmupBarBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--accent)' },

  // Warmup screen
  warmupTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 42, lineHeight: 0.95, margin: '0 0 6px', letterSpacing: -1.5, color: 'var(--text)' },
  warmupSubtitle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 1.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 },
  warmupNote: { fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, fontStyle: 'italic' },
  warmupList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 },
  warmupCard: { width: '100%', textAlign: 'left', border: '1.5px solid var(--border)', borderRadius: 16, padding: '16px 18px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 8 },
  warmupCardTop: { display: 'flex', alignItems: 'center', gap: 12 },
  warmupNumber: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Archivo Black', sans-serif", fontSize: 13, flexShrink: 0 },
  warmupName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 16, lineHeight: 1, letterSpacing: -0.2, flex: 1 },
  warmupReps: { fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, letterSpacing: 0.5 },
  warmupTip: { fontFamily: "'Inter', sans-serif", fontSize: 12, lineHeight: 1.4 },
  warmupCheck: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, fontWeight: 700, textAlign: 'right' },

  // Cooldown completion takeover (gentle, sequential fades)
  cooldownCelebrate: { position: 'fixed', inset: 0, background: 'var(--accent-gradient)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 200, animation: 'cooldownBgIn 5.5s ease-in-out forwards', textAlign: 'center', padding: '40px 28px' },
  cooldownCelebrateTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 64, lineHeight: 1, letterSpacing: -2, color: '#fff', textShadow: '0 4px 24px rgba(0,0,0,0.18)', animation: 'cooldownTitleFade 5.5s ease-in-out forwards', position: 'absolute' },
  cooldownCelebrateSub: { fontFamily: "'Archivo Black', sans-serif", fontSize: 56, lineHeight: 1.05, letterSpacing: -1.6, color: '#fff', textShadow: '0 4px 24px rgba(0,0,0,0.18)', animation: 'cooldownSubFade 5.5s ease-in-out forwards', position: 'absolute' },

  // Home
  homeIntro: { marginBottom: 30, textAlign: 'center' },
  homeKicker: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: 'var(--accent)', fontWeight: 700, marginBottom: 8 },
  homeTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 34, lineHeight: 0.98, margin: 0, letterSpacing: -1, color: 'var(--text)' },
  section: { marginBottom: 30 },
  sectionLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.8, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 13 },
  targetRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  dailyGoalLine: { fontFamily: "'Archivo Black', sans-serif", fontSize: 28, lineHeight: 1.05, letterSpacing: -0.6, color: 'var(--text)', marginBottom: 20, marginTop: 8, textAlign: 'center' },
  primaryTargetBtn: { width: '100%', aspectRatio: 'auto', padding: '26px 0', marginBottom: 26 },
  scaledHeader: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.8, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textAlign: 'center' },
  scaledRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxWidth: '78%', margin: '0 auto' },
  scaledTargetBtn: { aspectRatio: '1' },
  scaledTargetBtnNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 34, lineHeight: 1 },
  scaledTargetBtnLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.6, fontWeight: 700, marginTop: 5, opacity: 0.7 },
  targetBtn: { aspectRatio: '1', border: '1.5px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', borderRadius: 18, boxShadow: '0 1px 3px var(--shadow-sm)' },
  targetBtnNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 42, lineHeight: 1 },
  targetBtnLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.8, fontWeight: 700, marginTop: 5, opacity: 0.7 },
  equipCol: { display: 'flex', flexDirection: 'column', gap: 9 },
  equipBtn: { display: 'grid', gridTemplateColumns: '1fr 26px', alignItems: 'center', gap: 14, padding: '17px 18px', border: '1.5px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', borderRadius: 14, boxShadow: '0 1px 3px var(--shadow-sm)' },
  equipLabel: { fontFamily: "'Archivo Black', sans-serif", fontSize: 15, letterSpacing: 0.3 },
  equipCheck: { width: 24, height: 24, border: '2px solid var(--border-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--surface)', fontSize: 13, fontWeight: 700, borderRadius: 7 },
  poolHint: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1, color: 'var(--text-muted)', marginTop: 10, fontWeight: 700 },
  startBtn: { width: '100%', fontFamily: "'Archivo Black', sans-serif", fontSize: 26, padding: '22px 0', background: 'var(--accent-gradient)', color: 'var(--surface)', border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px var(--accent-shadow-lg)', marginBottom: 24, letterSpacing: 1, borderRadius: 16 },

  // Workout
  sessionBadges: { display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' },
  changeLink: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, padding: '7px 12px', background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)', cursor: 'pointer', borderRadius: 8, boxShadow: '0 1px 2px var(--shadow-xs)' },
  badge: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, padding: '7px 12px', background: 'var(--text)', color: 'var(--bg-solid)', borderRadius: 8 },

  card: { background: 'var(--dark-card-bg)', color: 'var(--dark-card-text)', padding: '30px 24px', border: 'none', marginBottom: 20, borderRadius: 20, boxShadow: '0 8px 28px var(--shadow-lg)' },
  todayLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: 'var(--dark-card-accent)', fontWeight: 700, marginBottom: 10 },
  exerciseName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 32, lineHeight: 0.96, margin: '0 0 14px', letterSpacing: -0.5, color: 'var(--dark-card-accent)' },
  tip: { fontSize: 14, color: 'var(--dark-card-muted)', lineHeight: 1.5, borderTop: '1px solid var(--dark-card-border)', paddingTop: 14 },
  priorRecap: { marginTop: 14, padding: '14px 0 4px', borderTop: '1px solid var(--dark-card-border)' },
  priorRecapHeader: { display: 'flex', alignItems: 'center', gap: 10 },
  priorRecapCount: { fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--dark-card-accent)', letterSpacing: -0.5, lineHeight: 1 },
  priorRecapLabel: { fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'var(--dark-card-text)', fontWeight: 600, lineHeight: 1.3 },
  priorRecapNoteBlock: { marginTop: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: 10, borderLeft: '3px solid var(--dark-card-accent)' },
  priorRecapNoteHeader: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, fontWeight: 700, color: 'var(--dark-card-accent)', marginBottom: 6 },
  priorRecapNote: { fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'var(--dark-card-text)', lineHeight: 1.5, fontStyle: 'italic' },
  howToLink: { display: 'inline-block', marginTop: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: 'var(--dark-card-accent)', textDecoration: 'none', borderBottom: '1px solid var(--dark-card-accent)', paddingBottom: 2 },
  counterBlock: { background: 'var(--surface)', border: '1.5px solid var(--border)', padding: 22, marginBottom: 16, borderRadius: 20, boxShadow: '0 2px 10px var(--shadow-xs)' },

  // Timer display (workout screen)
  timerBlock: { textAlign: 'center', padding: '14px 0 16px', marginBottom: 14, borderBottom: '1.5px solid var(--border)' },
  timerLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 6 },
  timerValue: { fontFamily: "'Archivo Black', sans-serif", fontSize: 44, lineHeight: 1, color: 'var(--text)', letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' },
  timerControls: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 },
  timerCtrlBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.8, padding: '8px 16px', background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)', cursor: 'pointer', borderRadius: 8 },

  // Timer prompt (before countdown)
  timerPromptOverlay: { position: 'fixed', inset: 0, background: 'var(--countdown-overlay)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 96, padding: 28, animation: 'fadeIn 0.2s ease' },
  timerPromptCard: { width: '100%', maxWidth: 360, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 22, padding: '28px 24px', boxShadow: '0 16px 40px var(--shadow-lg)', textAlign: 'center' },
  timerPromptTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 24, lineHeight: 1.05, letterSpacing: -0.5, color: 'var(--text)', marginBottom: 10 },
  timerPromptSub: { fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'var(--text-muted)', marginBottom: 22, lineHeight: 1.4 },
  timerPromptButtons: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },

  schemeBar: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-solid)', border: '1.5px solid var(--border)', padding: '12px 16px', marginBottom: 18, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)', borderRadius: 12 },
  schemeBarLeft: { textAlign: 'left' },
  schemeBarRight: { textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 },
  schemeLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: 'var(--text-muted)', fontWeight: 700 },
  schemeName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 17, lineHeight: 1, marginTop: 3 },
  schemeSub: { fontSize: 11, color: 'var(--text-muted)' },
  schemeChevron: { fontSize: 13, color: 'var(--text-muted)' },
  schemeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginBottom: 18 },
  schemeChip: { border: '1.5px solid var(--border)', padding: '11px 9px', textAlign: 'left', fontFamily: 'inherit', borderRadius: 10, background: 'var(--surface)' },
  schemeChipLabel: { fontFamily: "'Archivo Black', sans-serif", fontSize: 13, lineHeight: 1 },
  schemeChipSub: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, marginTop: 4, opacity: 0.65 },
  schemeNote: { gridColumn: '1 / -1', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1, textAlign: 'center', color: 'var(--text-muted)', padding: '4px 0' },

  counterTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  repsLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 },
  repsValue: { fontFamily: "'Archivo Black', sans-serif", fontSize: 64, lineHeight: 0.9 },
  repsTarget: { color: 'var(--target-faint)', fontSize: 32 },
  pctBox: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, paddingBottom: 8 },
  pctValue: { fontSize: 20, color: 'var(--text)' },
  progressTrack: { height: 10, background: 'var(--progress-track)', border: 'none', marginBottom: 22, position: 'relative', overflow: 'hidden', borderRadius: 6 },
  progressFill: { height: '100%', transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1), background 0.3s', borderRadius: 6 },

  setGrid: { display: 'grid', gap: 8, marginBottom: 12 },
  setTile: { aspectRatio: '1', border: '1.5px solid var(--border)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', padding: 4, borderRadius: 12, background: 'var(--surface)' },
  setTileNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 22, lineHeight: 1 },
  setTileLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 1, fontWeight: 700, marginTop: 4 },

  btnRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 },
  repBtn: { fontFamily: "'Archivo Black', sans-serif", fontSize: 20, padding: '18px 0', background: 'var(--accent-gradient)', color: 'var(--surface)', border: 'none', cursor: 'pointer', boxShadow: '0 3px 10px var(--accent-shadow-md)', borderRadius: 12 },
  secondaryRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  ghostBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, padding: '13px 0', background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)', cursor: 'pointer', borderRadius: 10 },
  primaryBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, padding: '13px 0', background: 'var(--text)', color: 'var(--surface)', border: 'none', cursor: 'pointer', borderRadius: 10 },
  doneBlock: { textAlign: 'center', padding: '12px 0' },
  doneText: { fontFamily: "'Archivo Black', sans-serif", fontSize: 48, color: 'var(--accent)', lineHeight: 1 },
  doneSub: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: 'var(--text-muted)', margin: '8px 0 16px', fontWeight: 700 },
  footer: { display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: 'var(--text-muted)', fontWeight: 700, paddingTop: 14, borderTop: '1px solid var(--border)' },

  flash: { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 100 },
  flashBg: { position: 'fixed', inset: 0, background: 'var(--accent-gradient)', pointerEvents: 'none', zIndex: 94, animation: 'flashBgIn 4s ease-out forwards' },
  countdownOverlay: { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--countdown-overlay)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 95, cursor: 'pointer', animation: 'fadeIn 0.2s ease' },
  countdownNumber: { fontFamily: "'Archivo Black', sans-serif", fontSize: 220, lineHeight: 1, color: 'var(--surface)', textShadow: '0 0 40px rgba(232,68,47,0.6), 0 0 80px var(--accent-shadow-md)', letterSpacing: -8, animation: 'countdownTick 1s ease-out forwards' },
  countdownGo: { fontSize: 140, background: 'linear-gradient(135deg, #ffd700 0%, var(--accent-light) 50%, var(--accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textShadow: 'none', letterSpacing: -4, animation: 'countdownGoIn 0.7s cubic-bezier(.36,.07,.19,.97) forwards' },
  countdownHint: { position: 'absolute', bottom: 60, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase' },
  flashInner: { color: '#fff', padding: '40px 30px', textAlign: 'center', animation: 'flashIn 4s ease-out forwards', textShadow: '0 4px 24px rgba(0,0,0,0.25)' },
  flashDidIt: { fontFamily: "'Archivo Black', sans-serif", fontSize: 56, lineHeight: 1, letterSpacing: -1, marginBottom: 18 },
  flashBig: { fontFamily: "'Archivo Black', sans-serif", fontSize: 200, lineHeight: 0.85, letterSpacing: -6 },
  flashSub: { fontFamily: "'JetBrains Mono', monospace", fontSize: 22, letterSpacing: 5, fontWeight: 700, marginTop: 16 },

  // Sheet
  sheetOverlay: { position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, animation: 'fadeIn 0.2s ease' },
  sheet: { width: '100%', maxWidth: 480, background: 'var(--bg-solid)', border: 'none', padding: '22px 20px', minHeight: '75vh', maxHeight: '88vh', overflow: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)', borderRadius: '24px 24px 0 0', boxShadow: '0 -8px 40px var(--shadow-lg)' },
  sheetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  tabs: { display: 'flex', gap: 4 },
  tab: { fontFamily: "'Archivo Black', sans-serif", fontSize: 15, padding: '7px 13px', background: 'transparent', border: 'none', color: 'var(--text-subtle)', cursor: 'pointer', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 },
  tabBadge: { background: 'var(--accent)', color: 'var(--surface)', borderRadius: 8, padding: '1px 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, minWidth: 18, textAlign: 'center' },
  tabActive: { color: 'var(--text)', background: 'var(--surface)', boxShadow: '0 1px 3px var(--shadow-md)' },
  sheetTitleSolo: { fontFamily: "'Archivo Black', sans-serif", fontSize: 26, color: 'var(--text)' },
  adminFooter: { marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' },

  sheetStats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20, background: 'var(--surface)', padding: '16px 10px', borderRadius: 14, border: '1.5px solid var(--border)', boxShadow: '0 1px 3px var(--shadow-xs)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.8, fontWeight: 700, color: 'var(--text)', marginTop: 18, marginBottom: 13, paddingBottom: 8, borderBottom: '1.5px solid var(--border)' },
  sectionCount: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--accent)' },
  medalGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 8 },
  medal: { display: 'grid', gridTemplateColumns: '44px 1fr', alignItems: 'center', gap: 13, padding: '12px 15px', border: '1.5px solid var(--border)', borderRadius: 12 },
  medalIcon: { width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: 18, fontWeight: 700 },
  medalBody: { minWidth: 0 },
  medalLabel: { fontFamily: "'Archivo Black', sans-serif", fontSize: 14, lineHeight: 1, letterSpacing: 0.2 },
  medalSub: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 4, letterSpacing: 0.5 },
  statNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 30, lineHeight: 1, color: 'var(--accent)', textAlign: 'center' },
  statLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.2, fontWeight: 700, color: 'var(--text-muted)', marginTop: 5, textAlign: 'center' },
  historyList: { display: 'flex', flexDirection: 'column', gap: 2 },
  historyRow: { display: 'grid', gridTemplateColumns: '70px 1fr 50px', alignItems: 'center', padding: '12px 4px', fontSize: 13, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-soft)', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', borderRadius: 6, gap: 4 },
  historySortRow: { display: 'flex', gap: 6, marginBottom: 12 },
  historySortBtn: { flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, padding: '10px 0', border: '1.5px solid var(--border)', cursor: 'pointer', borderRadius: 8, boxShadow: '0 1px 2px var(--shadow-xs)' },
  historyNotePreview: { fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },

  // Note popup (tap row in history to add/edit notes)
  notePopupOverlay: { position: 'fixed', inset: 0, background: 'var(--countdown-overlay)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80, padding: 24, animation: 'fadeIn 0.2s ease' },
  notePopupCard: { width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 20, padding: '22px 22px', boxShadow: '0 16px 40px var(--shadow-lg)' },
  notePopupTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 22, lineHeight: 1.05, letterSpacing: -0.4, color: 'var(--text)', marginBottom: 6 },
  notePopupMeta: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 18, fontWeight: 700 },
  notePopupLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 },
  notePopupTextarea: { width: '100%', fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.5, padding: '12px 14px', border: '1.5px solid var(--border)', background: 'var(--surface-input)', color: 'var(--text)', borderRadius: 10, resize: 'vertical', minHeight: 110, marginBottom: 14, boxShadow: '0 1px 2px var(--shadow-xs)' },
  notePopupDoneBtn: { width: '100%', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, padding: '13px 0', background: 'var(--text)', color: 'var(--bg-solid)', border: 'none', cursor: 'pointer', borderRadius: 10 },
  historyHeader: { marginBottom: 16, paddingBottom: 12, borderBottom: '1.5px solid var(--border)' },
  historyTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--text)', letterSpacing: -0.3 },
  historySubtitle: { fontFamily: "'Inter', sans-serif", fontSize: 13, letterSpacing: 0, color: 'var(--text-muted)', fontWeight: 500, marginTop: 7, lineHeight: 1.4 },
  historyDate: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1 },
  historyEx: { fontWeight: 600, fontSize: 13 },
  historyScheme: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, color: 'var(--text-muted)', marginTop: 2 },
  historyDuration: { color: 'var(--accent)', fontWeight: 700 },
  historyReps: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textAlign: 'right', color: 'var(--accent)' },
  emptyHistory: { padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 },
  accountBlock: { marginTop: 24, padding: '16px', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 1px 3px var(--shadow-xs)' },
  accountInfo: { minWidth: 0 },
  accountName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 14, lineHeight: 1.1 },
  accountEmail: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-muted)', marginTop: 3, letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  accountActions: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },

  bigAddBtn: { width: '100%', fontFamily: "'Archivo Black', sans-serif", fontSize: 17, padding: '17px 0', background: 'var(--accent-gradient)', color: 'var(--surface)', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px var(--accent-shadow-md)', marginBottom: 24, letterSpacing: 1, borderRadius: 14 },
  addForm: { border: '1.5px solid var(--border)', padding: 18, marginBottom: 24, background: 'var(--surface)', borderRadius: 14 },
  formLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 },
  formHelp: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--text-muted)', marginTop: -8, marginBottom: 12, fontStyle: 'italic' },
  nameInput: { fontFamily: "'Archivo Black', sans-serif", fontSize: 18, padding: '11px 14px', border: '1.5px solid var(--border-input)', background: 'var(--surface-input)', color: 'var(--text)', letterSpacing: 0.5, textTransform: 'uppercase', borderRadius: 10 },
  formEquipRow: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  formEquipChip: { padding: '9px 12px', border: '1.5px solid var(--border)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', borderRadius: 8 },
  tipInput: { width: '100%', fontSize: 14, padding: '11px 14px', border: '1.5px solid var(--border-input)', background: 'var(--surface-input)', color: 'var(--text)', marginBottom: 12, borderRadius: 10 },
  formButtons: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  errorText: { color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, marginBottom: 10 },

  movesHeader: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.8, fontWeight: 700, color: 'var(--text)', marginTop: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '1.5px solid var(--border)' },
  emptyMoves: { padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' },
  moveRow: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border-soft)' },
  moveBody: { minWidth: 0 },
  moveName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 14, lineHeight: 1.1 },
  moveMeta: { fontSize: 10, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5 },
  deleteBtn: { width: 34, height: 34, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'inherit', borderRadius: 9 },
  toggleBtn: { minWidth: 52, padding: '7px 11px', border: '1.5px solid var(--border)', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', borderRadius: 7 },

  // Auth screen
  authFrame: { maxWidth: 420, margin: '0 auto', padding: '32px 4px', display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  authBrand: { marginTop: 24, marginBottom: 40, textAlign: 'center' },
  authKicker: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 3, color: 'var(--accent)', fontWeight: 700, marginBottom: 16 },
  authTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 34, lineHeight: 1.08, margin: 0, letterSpacing: -1, color: 'var(--text)' },
  appleBtn: { width: '100%', padding: '17px 0', background: 'var(--text)', color: 'var(--surface)', border: 'none', fontFamily: "'Archivo Black', sans-serif", fontSize: 14, letterSpacing: 1, cursor: 'pointer', borderRadius: 14, marginBottom: 10, boxShadow: '0 4px 14px var(--shadow-charcoal)' },
  googleBtn: { width: '100%', padding: '17px 0', background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)', fontFamily: "'Archivo Black', sans-serif", fontSize: 14, letterSpacing: 1, cursor: 'pointer', borderRadius: 14, marginBottom: 10, boxShadow: '0 1px 3px var(--shadow-sm)' },
  authDivider: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' },
  authDividerLine: { flex: 1, height: 1, background: 'var(--border)' },
  authDividerText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: 'var(--text-muted)', fontWeight: 700 },
  emailBtn: { width: '100%', padding: '17px 0', background: 'var(--accent-gradient)', color: 'var(--surface)', border: 'none', fontFamily: "'Archivo Black', sans-serif", fontSize: 14, letterSpacing: 1, cursor: 'pointer', borderRadius: 14, marginBottom: 10, boxShadow: '0 4px 14px var(--accent-shadow-md)' },
  authTextLink: { width: '100%', padding: '12px 0', background: 'transparent', color: 'var(--text)', border: 'none', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', marginTop: 4 },
  authBackLink: { width: '100%', padding: '8px 0', background: 'transparent', color: 'var(--text-muted)', border: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1, fontWeight: 700, cursor: 'pointer', marginTop: 6 },
  authFinePrint: { textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1, color: 'var(--text-muted)', marginTop: 'auto', paddingTop: 24 },
  authForm: { background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 18, padding: 22, marginBottom: 12, boxShadow: '0 2px 12px var(--shadow-sm)' },
  authFormTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 16, letterSpacing: -0.3 },
  authLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, marginTop: 4 },
  authInput: { width: '100%', fontFamily: 'inherit', fontSize: 15, padding: '13px 15px', border: '1.5px solid var(--border-input)', background: 'var(--surface-input)', color: 'var(--text)', marginBottom: 14, borderRadius: 10 },
  authErrorText: { color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, marginBottom: 12 },
  authNoticeText: { color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, marginTop: 12, marginBottom: 4, lineHeight: 1.4 },
  authSubmitBtn: { width: '100%', padding: '17px 0', background: 'var(--text)', color: 'var(--surface)', border: 'none', fontFamily: "'Archivo Black', sans-serif", fontSize: 14, letterSpacing: 1, cursor: 'pointer', borderRadius: 14, boxShadow: '0 4px 14px var(--shadow-charcoal)' },

  // Friends UI
  subtabRow: { display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 },
  subtab: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, padding: '9px 13px', border: '1.5px solid var(--border)', cursor: 'pointer', borderRadius: 8, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 },
  subtabBadge: { background: 'var(--accent)', color: 'var(--surface)', borderRadius: 6, padding: '1px 5px', fontSize: 9, fontWeight: 700 },
  emptyFriends: { padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' },
  leaderRow: { display: 'grid', gridTemplateColumns: '34px 1fr auto auto', alignItems: 'center', gap: 10, padding: '11px 12px', borderBottom: '1px solid var(--border-soft)', borderRadius: 10 },
  leaderRank: { fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: 'var(--accent)', textAlign: 'center' },
  leaderBody: { minWidth: 0 },
  leaderName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 14, lineHeight: 1.1 },
  leaderHandle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-muted)', marginTop: 2 },
  leaderStreak: { textAlign: 'right', lineHeight: 1 },
  leaderStreakNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: 'var(--text)', display: 'block' },
  leaderStreakLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--text-muted)', letterSpacing: 1, fontWeight: 700 },
  requestRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 0', borderBottom: '1px solid var(--border-soft)' },
  acceptBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '9px 13px', background: 'var(--accent-gradient)', color: 'var(--surface)', border: 'none', cursor: 'pointer', borderRadius: 8, boxShadow: '0 2px 8px var(--accent-shadow-sm)' },
  declineBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, padding: '9px 11px', background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)', cursor: 'pointer', borderRadius: 8 },
  smallGhostBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: '7px 11px', background: 'var(--surface)', color: 'var(--text)', border: '1.5px solid var(--border)', cursor: 'pointer', borderRadius: 8 },
  helpText: { fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.45, marginBottom: 16, padding: '12px 14px', background: 'var(--surface)', borderRadius: 12, border: '1.5px solid var(--border)' },
  memberPickRow: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 15px', border: '1.5px solid var(--border)', cursor: 'pointer', borderRadius: 10, marginBottom: 6, fontFamily: 'inherit', fontSize: 14, fontWeight: 600 },
  squadActionRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 },
  squadActionBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, padding: "13px 0", background: "var(--surface)", color: "var(--text)", border: "1.5px solid var(--border)", cursor: "pointer", borderRadius: 10 },
  squadCard: { width: "100%", textAlign: "left", background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 8px var(--shadow-xs)", cursor: "pointer", fontFamily: "inherit", color: "inherit" },
  squadCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  squadCardBottom: { display: "flex", alignItems: "center", gap: 10 },
  squadName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 18, lineHeight: 1, letterSpacing: -0.3 },
  squadStatusChip: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1.2, padding: "4px 9px", borderRadius: 999, flexShrink: 0 },
  squadStreakMini: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "var(--text-muted)" },
  squadStreakMiniNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 16, color: "var(--accent)" },
  squadStreakMiniLabel: { color: "var(--text-muted)" },
  squadSaveChip: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-muted)", marginLeft: "auto" },
  squadMyStatus: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1 },
  backLink: { fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: 1.5, cursor: "pointer", padding: "13px 0", display: "block", width: "100%", textAlign: "center", background: "#000", color: "#fff", border: "1.5px solid #000", borderRadius: 10, marginBottom: 16 },
  squadDetailCard: { background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: 16, padding: "18px 16px", marginBottom: 18 },
  squadDetailName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 24, letterSpacing: -0.5, lineHeight: 1, marginBottom: 16 },
  squadDetailStreakRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 },
  squadDetailStreakBlock: { textAlign: "center" },
  squadDetailStreakNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: "var(--accent)", lineHeight: 1, marginBottom: 4 },
  squadDetailStreakLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.2, fontWeight: 700, color: "var(--text-muted)", lineHeight: 1.3 },
  squadDetailRule: { fontFamily: "'Inter', sans-serif", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.8, borderTop: "1px solid var(--border-soft)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 2 },
  squadMemberRow2: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, marginBottom: 6 },
  squadMemberName2: { fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600 },
  squadMemberBadge: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: "5px 10px", borderRadius: 999 },
  squadCodeBlock: { marginTop: 16, padding: "10px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, textAlign: "center" },
  squadCodeLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 2, fontWeight: 700, color: "var(--text-muted)", marginBottom: 4 },
  squadCodeValue: { fontFamily: "'Archivo Black', sans-serif", fontSize: 24, letterSpacing: 6, color: "var(--accent)", marginBottom: 4 },
  squadCodeHint: { fontFamily: "'Inter', sans-serif", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 },
  squadHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  squadMembers: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--text-muted)", marginTop: 4 },
  squadStreakBlock: { display: "flex", alignItems: "center", gap: 12 },
  squadStreakNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 40, color: "var(--accent)" },
  squadStreakLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5 },
  squadMemberList: { display: "flex", flexDirection: "column", gap: 4 },
  squadMemberRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" },
  squadMemberStreak: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "var(--accent)" },

  // Emoji reactions (squad detail view)
  reactionRow: { display: 'flex', gap: 4, padding: '4px 12px 8px', flexWrap: 'wrap' },
  reactionBtn: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '1.5px solid var(--border)', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, lineHeight: 1, background: 'var(--surface)', flexShrink: 0 },
  reactionChip: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '1.5px solid var(--border)', borderRadius: 20, fontSize: 16, lineHeight: 1, background: 'var(--surface)', flexShrink: 0 },
  reactionCount: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, lineHeight: 1 },

  loadingWrap: { minHeight: '100vh', background: 'var(--bg-solid)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingDot: { width: 16, height: 16, background: 'var(--accent)', borderRadius: '50%', animation: 'pulse 1.2s ease-in-out infinite' },
};
