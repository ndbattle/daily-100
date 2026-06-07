import React, { useState, useEffect, useMemo, useRef } from 'react';

const EQUIPMENT_OPTIONS = [
  { id: 'bodyweight', label: 'BODYWEIGHT' },
  { id: 'dumbbell',   label: 'DUMBBELLS' },
  { id: 'kettlebell', label: 'KETTLEBELL' },
  { id: 'band',       label: 'RESISTANCE BAND' },
];

const TARGET_OPTIONS = [50, 75, 100];

const BUILTIN_EXERCISES = [
  // ---- Bodyweight ----
  { name: 'PUSH-UPS', tip: 'Keep core tight. Drop to knees if form breaks.', equipment: ['bodyweight'] },
  { name: 'BODYWEIGHT SQUATS', tip: 'Knees track over toes. Sit back into hips.', equipment: ['bodyweight'] },
  { name: 'JUMPING JACKS', tip: 'Stay light on the balls of your feet.', equipment: ['bodyweight'] },
  { name: 'SIT-UPS', tip: 'Hands behind ears, lead with chest, not neck.', equipment: ['bodyweight'] },
  { name: 'CRUNCHES', tip: 'Lift shoulder blades. Lower back stays planted.', equipment: ['bodyweight'] },
  { name: 'ALTERNATING LUNGES', tip: 'Count each leg. Back knee toward floor.', equipment: ['bodyweight'] },
  { name: 'MOUNTAIN CLIMBERS', tip: 'Hips low. Drive knees, don\'t bounce.', equipment: ['bodyweight'] },
  { name: 'HIGH KNEES', tip: 'Knees to hip height. Quick, light steps.', equipment: ['bodyweight'] },
  { name: 'GLUTE BRIDGES', tip: 'Squeeze at the top. Pause for 1 second.', equipment: ['bodyweight'] },
  { name: 'CALF RAISES', tip: 'Pause at the top. Full stretch at bottom.', equipment: ['bodyweight'] },
  { name: 'RUSSIAN TWISTS', tip: 'Each side = 1 rep. Lean back at 45°.', equipment: ['bodyweight'] },
  { name: 'BICYCLE CRUNCHES', tip: 'Elbow to opposite knee. Slow and controlled.', equipment: ['bodyweight'] },
  { name: 'JUMP SQUATS', tip: 'Land soft. Drop straight into the next squat.', equipment: ['bodyweight'] },
  { name: 'REVERSE LUNGES', tip: 'Step back, not forward. Counts both legs.', equipment: ['bodyweight'] },
  { name: 'TRICEP DIPS', tip: 'Use a chair. Elbows back, not flared.', equipment: ['bodyweight'] },
  { name: 'SHOULDER TAPS', tip: 'In plank. Tap opposite shoulder. No hip sway.', equipment: ['bodyweight'] },
  { name: 'FLUTTER KICKS', tip: 'Lower back pressed to floor. Small fast kicks.', equipment: ['bodyweight'] },
  { name: 'LEG RAISES', tip: 'Lower slow. Don\'t let feet touch the floor.', equipment: ['bodyweight'] },
  { name: 'BIRD DOGS', tip: 'Opposite arm and leg. Pause 1 sec each rep.', equipment: ['bodyweight'] },
  { name: 'TOE TOUCHES', tip: 'Legs up, reach for toes. Crunch the abs.', equipment: ['bodyweight'] },
  { name: 'STAR JUMPS', tip: 'Explode out. Arms and legs full extension.', equipment: ['bodyweight'] },
  { name: 'SKATER JUMPS', tip: 'Side to side. Land soft, sweep back leg.', equipment: ['bodyweight'] },
  { name: 'DONKEY KICKS', tip: 'On all fours. Squeeze glute at the top.', equipment: ['bodyweight'] },
  { name: 'PIKE PUSH-UPS', tip: 'Hips high, head between hands. Shoulder builder.', equipment: ['bodyweight'] },

  // ---- Dumbbell ----
  { name: 'DUMBBELL CURLS', tip: 'Elbows pinned to ribs. Slow on the lowering.', equipment: ['dumbbell'] },
  { name: 'HAMMER CURLS', tip: 'Neutral grip. Don\'t swing the hips.', equipment: ['dumbbell'] },
  { name: 'DUMBBELL SHOULDER PRESS', tip: 'Press straight up. Don\'t arch the back.', equipment: ['dumbbell'] },
  { name: 'LATERAL RAISES', tip: 'Lead with elbows. Stop at shoulder height.', equipment: ['dumbbell'] },
  { name: 'DUMBBELL ROWS', tip: 'Each side = 1 rep. Pull to your hip.', equipment: ['dumbbell'] },
  { name: 'DUMBBELL LUNGES', tip: 'Counts both legs. Vertical torso.', equipment: ['dumbbell'] },
  { name: 'DUMBBELL THRUSTERS', tip: 'Squat into press. One smooth motion.', equipment: ['dumbbell'] },
  { name: 'TRICEP KICKBACKS', tip: 'Upper arm parallel to floor. Don\'t swing.', equipment: ['dumbbell'] },
  { name: 'DUMBBELL FLOOR PRESS', tip: 'Elbows touch floor, then drive up.', equipment: ['dumbbell'] },
  { name: 'DUMBBELL DEADLIFTS', tip: 'Hinge at hips. Back stays flat.', equipment: ['dumbbell'] },
  { name: 'RENEGADE ROWS', tip: 'Plank position. Each side = 1 rep.', equipment: ['dumbbell'] },
  { name: 'DUMBBELL PULLOVERS', tip: 'Lying down. Stretch overhead, pull to chest.', equipment: ['dumbbell'] },

  // ---- Kettlebell ----
  { name: 'KETTLEBELL SWINGS', tip: 'Power from hips, not arms. Bell floats.', equipment: ['kettlebell'] },
  { name: 'KETTLEBELL CLEANS', tip: 'Each side = 1 rep. No bell-to-wrist banging.', equipment: ['kettlebell'] },
  { name: 'KETTLEBELL SNATCHES', tip: 'Each side = 1 rep. Bell punches to ceiling.', equipment: ['kettlebell'] },
  { name: 'KETTLEBELL HALOS', tip: 'Each direction = 1 rep. Slow and tight.', equipment: ['kettlebell'] },
  { name: 'KETTLEBELL HIGH PULLS', tip: 'Elbow leads. Stop at shoulder height.', equipment: ['kettlebell'] },
  { name: 'KB CLEAN AND PRESS', tip: 'Each side = 1 rep. Clean, then strict press.', equipment: ['kettlebell'] },
  { name: 'KETTLEBELL FIGURE 8s', tip: 'Pass between legs. Each loop = 1 rep.', equipment: ['kettlebell'] },
  { name: 'KB AROUND-THE-WORLDS', tip: 'Pass around body. Each direction = 1 rep.', equipment: ['kettlebell'] },
  { name: 'KETTLEBELL DEADLIFTS', tip: 'Bell between heels. Drive through floor.', equipment: ['kettlebell'] },
  { name: 'KETTLEBELL THRUSTERS', tip: 'Each side = 1 rep. Squat, then press.', equipment: ['kettlebell'] },

  // ---- Both dumbbell & kettlebell ----
  { name: 'GOBLET SQUATS', tip: 'Hold weight at chest. Elbows brush knees.', equipment: ['dumbbell', 'kettlebell'] },
  { name: 'WEIGHTED LUNGES', tip: 'Counts both legs. Hold weight at sides.', equipment: ['dumbbell', 'kettlebell'] },
  { name: 'WEIGHTED RUSSIAN TWISTS', tip: 'Each side = 1 rep. Lean back, twist.', equipment: ['dumbbell', 'kettlebell'] },

  // ---- Resistance band ----
  { name: 'BAND PULL-APARTS', tip: 'Arms straight. Squeeze shoulder blades.', equipment: ['band'] },
  { name: 'BAND BICEP CURLS', tip: 'Stand on band. Elbows pinned to ribs.', equipment: ['band'] },
  { name: 'BAND SHOULDER PRESS', tip: 'Stand on band. Press straight overhead.', equipment: ['band'] },
  { name: 'BAND ROWS', tip: 'Anchor band. Pull elbows to ribs.', equipment: ['band'] },
  { name: 'BAND LATERAL RAISES', tip: 'Stand on band. Lead with elbows.', equipment: ['band'] },
  { name: 'BAND TRICEP PUSHDOWNS', tip: 'Anchor high. Elbows locked at sides.', equipment: ['band'] },
  { name: 'BAND SQUATS', tip: 'Band under feet, over shoulders. Drive up.', equipment: ['band'] },
  { name: 'BAND GLUTE KICKBACKS', tip: 'Band at ankles. Kick straight back.', equipment: ['band'] },
  { name: 'BAND LATERAL WALKS', tip: 'Band above knees. Each step = 1 rep.', equipment: ['band'] },
  { name: 'BAND CLAMSHELLS', tip: 'Band above knees. Each side = 1 rep.', equipment: ['band'] },
  { name: 'BAND FACE PULLS', tip: 'Anchor high. Pull to forehead. Elbows up.', equipment: ['band'] },
  { name: 'BAND GOOD MORNINGS', tip: 'Band over shoulders. Hinge at hips.', equipment: ['band'] },
  { name: 'BAND CHEST FLYES', tip: 'Anchor behind. Bring hands together at chest.', equipment: ['band'] },
  { name: 'BAND DEADLIFTS', tip: 'Stand on band. Hinge, drive through floor.', equipment: ['band'] },
];

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

const TODAY = () => new Date().toISOString().slice(0, 10);

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

function buildPool(customExercises, disabledBuiltins, equipmentFilter) {
  const all = [...BUILTIN_EXERCISES, ...customExercises];
  const filtered = all.filter((e) => {
    if (disabledBuiltins.includes(e.name)) return false;
    const eq = e.equipment || ['bodyweight'];
    return eq.some((tag) => equipmentFilter.includes(tag));
  });
  if (filtered.length) return filtered;
  // Safety fallback
  return BUILTIN_EXERCISES.filter((e) => (e.equipment || []).includes('bodyweight'));
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
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
};

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

  // Home-page pending selections (not persisted until START)
  const [pendingTarget, setPendingTarget] = useState(100);

  // Sign-in form state
  const [authMode, setAuthMode] = useState('options'); // 'options' | 'email-signup' | 'email-signin'
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Friends UI
  const [friendsView, setFriendsView] = useState('friends'); // 'friends' | 'requests' | 'find' | 'squads'
  const [findQuery, setFindQuery] = useState('');
  const [creatingSquad, setCreatingSquad] = useState(false);
  const [newSquadName, setNewSquadName] = useState('');
  const [newSquadMembers, setNewSquadMembers] = useState([]);
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
        saved.sessionStarted = false; // back to home each day
        saved.workoutStarted = false;
      }

      setState(saved);
      setPendingTarget(saved.target || 100);
      setPendingEquipment(saved.equipment && saved.equipment.length ? saved.equipment : ['bodyweight']);
    } catch {
      setState({ ...DEFAULT_STATE });
    }
    setLoading(false);
  }, []);

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
    const entry = {
      date: TODAY(),
      exercise: exercise.name,
      reps: target,
      target,
      scheme: scheme.label,
      equipment: state.equipment,
      completed: true,
    };
    next.history = [entry, ...state.history.filter((h) => h.date !== TODAY())].slice(0, 30);
    setJustFinished(true);
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
  function pickScheme(id) {
    setState({ ...state, schemeId: id, reps: 0, setsDone: [] });
    setShowSchemes(false);
  }
  function swap() {
    if (!state || totalReps > 0) return;
    if (state.swapIndex >= 2) return;
    const pool = buildPool(state.customExercises, state.disabledBuiltins, state.equipment);
    const currentIdx = pool.findIndex((e) => e.name === state.todayExercise?.name);
    const nextIdx = ((currentIdx < 0 ? 0 : currentIdx) + 1) % pool.length;
    setState({ ...state, todayExercise: pool[nextIdx], swapIndex: state.swapIndex + 1 });
  }

  // Auth handlers (UI scaffolding — wire to a real provider later)
  function signInWith(provider) {
    setState({
      ...state,
      user: {
        provider,
        name: provider === 'apple' ? 'Apple User' : 'Google User',
        email: `you@${provider}.com`,
      },
      incomingRequests: state.incomingRequests.length ? state.incomingRequests : SEED_INCOMING,
    });
    setAuthError('');
  }
  function submitEmailAuth() {
    const email = authEmail.trim().toLowerCase();
    const name = authName.trim();
    const pwd = authPassword;
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
    setState({
      ...state,
      user: {
        provider: 'email',
        name: name || email.split('@')[0],
        email,
      },
      incomingRequests: state.incomingRequests.length ? state.incomingRequests : SEED_INCOMING,
    });
    setAuthEmail(''); setAuthName(''); setAuthPassword(''); setAuthError('');
    setAuthMode('options');
  }
  function signOut() {
    if (!window.confirm('Sign out? Your progress stays saved on this device.')) return;
    setState({ ...state, user: null, sessionStarted: false });
    setAuthMode('options');
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
  function createSquad(name, memberIds) {
    if (!name.trim() || memberIds.length === 0) return;
    setState({
      ...state,
      squads: [
        ...state.squads,
        {
          id: 'sq_' + Date.now(),
          name: name.trim(),
          memberIds,
          dailyGoal: 100,
        },
      ],
    });
  }
  function deleteSquad(squadId) {
    if (!window.confirm('Delete this squad?')) return;
    setState({ ...state, squads: state.squads.filter((s) => s.id !== squadId) });
  }

  function startSession() {
    if (!pendingEquipment.length) return;
    const pool = buildPool(state.customExercises, state.disabledBuiltins, pendingEquipment);
    if (!pool.length) return;
    const picked = pool[hashStr(TODAY() + pendingEquipment.join('-')) % pool.length];
    setState({
      ...state,
      target: pendingTarget,
      equipment: pendingEquipment,
      sessionStarted: true,
      workoutStarted: false,
      reps: 0,
      setsDone: [],
      schemeId: 'free',
      todayExercise: picked,
      swapIndex: 0,
    });
  }

  function beginWorkout() {
    setCountdown(10);
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
    } catch {}
  }

  function skipCountdown() {
    setCountdown(null);
    setState((prev) => ({ ...prev, workoutStarted: true }));
  }

  // Tick the countdown
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 'GO') {
      const t = setTimeout(() => {
        setCountdown(null);
        setState((prev) => ({ ...prev, workoutStarted: true }));
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
    setState({ ...state, sessionStarted: false, workoutStarted: false, reps: 0, setsDone: [] });
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
              <button style={styles.authSubmitBtn} onClick={submitEmailAuth}>
                {authMode === 'email-signup' ? 'CREATE ACCOUNT' : 'SIGN IN'} →
              </button>
              <button
                style={styles.authTextLink}
                onClick={() => {
                  setAuthMode(authMode === 'email-signup' ? 'email-signin' : 'email-signup');
                  setAuthError('');
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

  // ---------------- HOME SCREEN ----------------
  if (!state.sessionStarted) {
    const previewPool = buildPool(state.customExercises, state.disabledBuiltins, pendingEquipment);
    const canStart = pendingEquipment.length > 0 && previewPool.length > 0;

    return (
      <div style={styles.shell}>
        <style>{cssText}</style>
        <div style={styles.frame}>
          <div style={styles.headerRow}>
            <div>
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
            <button style={styles.iconBtn} onClick={() => { setShowSheet(true); setTab('log'); }}>☰</button>
          </div>

          <div style={styles.divider} />

          {/* Target picker */}
          <div style={styles.section}>
            <button
              style={{
                ...styles.targetBtn,
                ...styles.primaryTargetBtn,
                background: pendingTarget === 100 ? '#1a1a1a' : '#fff',
                color: pendingTarget === 100 ? '#faf6f0' : '#1a1a1a',
                boxShadow: pendingTarget === 100 ? '0 6px 18px rgba(26,26,26,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                border: pendingTarget === 100 ? '1.5px solid #1a1a1a' : '1.5px solid #e0d6c8',
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
                      background: active ? '#1a1a1a' : '#fff',
                      color: active ? '#faf6f0' : '#1a1a1a',
                      boxShadow: active ? '0 6px 18px rgba(26,26,26,0.25)' : '0 1px 3px rgba(0,0,0,0.06)',
                      border: active ? '1.5px solid #1a1a1a' : '1.5px solid #e0d6c8',
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
                      background: active ? '#1a1a1a' : '#fff',
                      color: active ? '#faf6f0' : '#1a1a1a',
                      borderColor: active ? '#1a1a1a' : '#e0d6c8',
                      boxShadow: active ? '0 4px 14px rgba(26,26,26,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                    onClick={() => togglePendingEquipment(eq.id)}
                  >
                    <span style={styles.equipLabel}>{eq.label}</span>
                    <span style={{
                      ...styles.equipCheck,
                      background: active ? '#e8442f' : 'transparent',
                      borderColor: active ? '#e8442f' : '#d0c6b8',
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
            <span>NO ZERO DAYS.</span>
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
          <button style={styles.iconBtn} onClick={() => { setShowSheet(true); setTab('log'); }}>☰</button>
        </div>

        <div style={styles.divider} />

        {/* Session badges */}
        <div style={styles.sessionBadges}>
          <button style={styles.changeLink} onClick={changeWorkout}>← BACK TO HOME</button>
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
                      background: active ? '#1a1a1a' : '#fff',
                      color: active ? '#faf6f0' : '#1a1a1a',
                      borderColor: active ? '#1a1a1a' : '#e0d6c8',
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

          <div style={styles.counterTop}>
            <div>
              <div style={styles.repsLabel}>
                REPS {scheme.sets && `· ${setsCompletedCount}/${scheme.sets.length} SETS`}
              </div>
              <div style={styles.repsValue}>
                <span style={{ color: done ? '#e8442f' : '#1a1a1a' }}>{totalReps}</span>
                <span style={styles.repsTarget}>/{target}</span>
              </div>
            </div>
            <div style={styles.pctBox}><div style={styles.pctValue}>{pct}%</div></div>
          </div>

          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${pct}%`, background: done ? 'linear-gradient(90deg, #f25138, #e8442f)' : '#1a1a1a' }} />
          </div>

          {done ? (
            <div style={styles.doneBlock}>
              <div style={styles.doneText}>DONE.</div>
              <div style={styles.doneSub}>See you tomorrow.</div>
              <button style={styles.ghostBtn} onClick={reset}>RESET TODAY</button>
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
                        background: completed ? 'linear-gradient(135deg, #f25138 0%, #e8442f 100%)' : nextToDo ? '#fff' : '#f7f2ea',
                        color: completed ? '#fff' : nextToDo ? '#1a1a1a' : '#b5aca2',
                        borderColor: completed ? 'transparent' : nextToDo ? '#1a1a1a' : '#e0d6c8',
                        boxShadow: completed ? '0 3px 10px rgba(232,68,47,0.3)' : nextToDo ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
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
          <Fireworks />
          <LightningBolts />
          <div style={styles.flash}>
            <div style={styles.flashInner}>
              <div style={styles.flashDidIt}>YOU DID IT!</div>
              <div style={styles.flashBig}>{target}</div>
              <div style={styles.flashSub}>REPS COMPLETE</div>
            </div>
          </div>
        </>
      )}

      {showSheet && renderSheet()}
    </div>
  );

  // ---------------- SHEET (shared between home + workout) ----------------
  function renderSheet() {
    const activeBuiltinCount = BUILTIN_EXERCISES.length - state.disabledBuiltins.length;
    return (
      <div style={styles.sheetOverlay} onClick={() => setShowSheet(false)}>
        <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
          <div style={styles.sheetHeader}>
            <div style={styles.tabs}>
              <button
                style={{ ...styles.tab, ...(tab === 'log' ? styles.tabActive : {}) }}
                onClick={() => setTab('log')}
              >LOG</button>
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
            <button style={styles.iconBtn} onClick={() => setShowSheet(false)}>✕</button>
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
                            background: m.earned ? 'linear-gradient(135deg, #f25138 0%, #e8442f 100%)' : '#fff',
                            color: m.earned ? '#fff' : '#1a1a1a',
                            borderColor: m.earned ? 'transparent' : '#e0d6c8',
                            boxShadow: m.earned ? '0 3px 12px rgba(232,68,47,0.25)' : 'none',
                            opacity: m.earned ? 1 : 0.65,
                          }}
                        >
                          <div style={{
                            ...styles.medalIcon,
                            background: m.earned ? 'rgba(255,255,255,0.22)' : '#f2ebe0',
                            color: m.earned ? '#fff' : '#c0b6a8',
                          }}>
                            {m.earned ? '★' : '☆'}
                          </div>
                          <div style={styles.medalBody}>
                            <div style={styles.medalLabel}>{m.label}</div>
                            <div style={{
                              ...styles.medalSub,
                              color: m.earned ? 'rgba(255,255,255,0.85)' : '#8a8178',
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

              <div style={styles.sectionHeader}>
                <span>HISTORY</span>
              </div>
              <div style={styles.historyList}>
                {state.history.length === 0 && (
                  <div style={styles.emptyHistory}>Finish today to start your log.</div>
                )}
                {state.history.map((h) => (
                  <div key={h.date} style={styles.historyRow}>
                    <div style={styles.historyDate}>
                      {new Date(h.date + 'T00:00:00').toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric',
                      })}
                    </div>
                    <div>
                      <div style={styles.historyEx}>{h.exercise}</div>
                      <div style={styles.historyScheme}>
                        {h.scheme}{h.equipment ? ` · ${h.equipment.join(' / ')}` : ''}
                      </div>
                    </div>
                    <div style={styles.historyReps}>{h.reps}</div>
                  </div>
                ))}
              </div>

              <div style={styles.accountBlock}>
                <div style={styles.accountInfo}>
                  <div style={styles.accountName}>{state.user.name}</div>
                  <div style={styles.accountEmail}>
                    {state.user.email} · {state.user.provider.toUpperCase()}
                  </div>
                </div>
                <button style={styles.ghostBtn} onClick={signOut}>SIGN OUT</button>
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
                  {['friends', 'requests', 'find', 'squads'].map((v) => {
                    const labels = { friends: 'FRIENDS', requests: 'REQUESTS', find: 'FIND', squads: 'SQUADS' };
                    const active = friendsView === v;
                    const count = v === 'requests' ? state.incomingRequests.length : 0;
                    return (
                      <button
                        key={v}
                        style={{
                          ...styles.subtab,
                          background: active ? '#1a1a1a' : '#fff',
                          color: active ? '#faf6f0' : '#1a1a1a',
                          borderColor: active ? '#1a1a1a' : '#e0d6c8',
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
                            background: p.isMe ? '#fff' : 'transparent',
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
                      style={{ ...styles.authInput, marginBottom: 16, background: '#fff' }}
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

                {friendsView === 'squads' && (
                  <>
                    <div style={styles.helpText}>
                      Squads are small groups that build a streak together. Everyone has to hit their daily target for the squad streak to count.
                    </div>

                    {!creatingSquad ? (
                      <button
                        style={styles.bigAddBtn}
                        onClick={() => {
                          if (state.friends.length === 0) {
                            window.alert('Add at least one friend before creating a squad.');
                            return;
                          }
                          setCreatingSquad(true);
                          setNewSquadName('');
                          setNewSquadMembers([]);
                        }}
                      >+ NEW SQUAD</button>
                    ) : (
                      <div style={styles.addForm}>
                        <div style={styles.formLabel}>SQUAD NAME</div>
                        <input
                          placeholder="Sunrise Crew"
                          value={newSquadName}
                          onChange={(e) => setNewSquadName(e.target.value)}
                          style={{ ...styles.nameInput, width: '100%', marginBottom: 14, textTransform: 'none' }}
                          maxLength={30}
                        />
                        <div style={styles.formLabel}>PICK MEMBERS</div>
                        <div style={{ marginBottom: 14 }}>
                          {state.friends.map((f) => {
                            const picked = newSquadMembers.includes(f.id);
                            return (
                              <button
                                key={f.id}
                                style={{
                                  ...styles.memberPickRow,
                                  background: picked ? '#1a1a1a' : '#fff',
                                  color: picked ? '#faf6f0' : '#1a1a1a',
                                  borderColor: picked ? '#1a1a1a' : '#e0d6c8',
                                }}
                                onClick={() =>
                                  setNewSquadMembers((cur) =>
                                    picked ? cur.filter((x) => x !== f.id) : [...cur, f.id]
                                  )
                                }
                              >
                                <span>{f.name}</span>
                                <span style={{ opacity: 0.7 }}>{picked ? '✓' : '+'}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div style={styles.formButtons}>
                          <button style={styles.ghostBtn} onClick={() => setCreatingSquad(false)}>CANCEL</button>
                          <button
                            style={styles.primaryBtn}
                            onClick={() => {
                              if (!newSquadName.trim() || newSquadMembers.length === 0) return;
                              createSquad(newSquadName, newSquadMembers);
                              setCreatingSquad(false);
                            }}
                          >CREATE</button>
                        </div>
                      </div>
                    )}

                    <div style={styles.movesHeader}>MY SQUADS · {state.squads.length}</div>
                    {state.squads.length === 0 ? (
                      <div style={styles.emptyFriends}>No squads yet.</div>
                    ) : (
                      state.squads.map((sq) => {
                        const members = sq.memberIds
                          .map((id) => state.friends.find((f) => f.id === id))
                          .filter(Boolean);
                        // Squad streak: min of everyone's streak (the chain breaks at the weakest link)
                        const allStreaks = [state.streak, ...members.map((m) => m.streak)];
                        const squadStreak = Math.min(...allStreaks);
                        return (
                          <div key={sq.id} style={styles.squadCard}>
                            <div style={styles.squadHeader}>
                              <div>
                                <div style={styles.squadName}>{sq.name}</div>
                                <div style={styles.squadMembers}>
                                  You + {members.map((m) => m.name.split(' ')[0]).join(', ')}
                                </div>
                              </div>
                              <button
                                style={styles.smallGhostBtn}
                                onClick={() => deleteSquad(sq.id)}
                                title="Delete squad"
                              >✕</button>
                            </div>
                            <div style={styles.squadStreakBlock}>
                              <div style={styles.squadStreakNum}>{squadStreak}</div>
                              <div style={styles.squadStreakLabel}>
                                DAY{squadStreak === 1 ? '' : 'S'}<br />SQUAD STREAK
                              </div>
                            </div>
                            <div style={styles.squadMemberList}>
                              <div style={styles.squadMemberRow}>
                                <span>You</span>
                                <span style={styles.squadMemberStreak}>{state.streak} d</span>
                              </div>
                              {members.map((m) => (
                                <div key={m.id} style={styles.squadMemberRow}>
                                  <span>{m.name}</span>
                                  <span style={styles.squadMemberStreak}>{m.streak} d</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
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
                            background: active ? '#1a1a1a' : '#faf6f0',
                            color: active ? '#faf6f0' : '#1a1a1a',
                            borderColor: active ? '#1a1a1a' : '#e0d6c8',
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
                        background: isOff ? '#fff' : '#1a1a1a',
                        color: isOff ? '#8a8178' : '#fff',
                        borderColor: isOff ? '#e0d6c8' : '#1a1a1a',
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
      </div>
    );
  }
}

const cssText = `
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700&display=swap');
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
@keyframes flashIn {
  0% { opacity: 0; transform: scale(0.85); }
  12% { opacity: 1; transform: scale(1.03); }
  75% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.98); }
}
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
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
button { transition: transform 0.08s ease, box-shadow 0.15s ease, background 0.15s ease, opacity 0.15s ease; }
button:active { transform: scale(0.98); }
button:disabled { cursor: not-allowed; }
input { font-family: inherit; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
input:focus { outline: none; border-color: #e8442f; box-shadow: 0 0 0 3px rgba(232,68,47,0.12); }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
`;

const styles = {
  shell: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #faf6f0 0%, #f4ede4 100%)',
    fontFamily: "'Inter', system-ui, sans-serif", color: '#1a1a1a',
    padding: '24px 18px 48px',
  },
  frame: { maxWidth: 480, margin: '0 auto' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  kicker: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.8, color: '#8a8178', marginBottom: 14, fontWeight: 700 },
  streakLine: { display: 'flex', alignItems: 'center', gap: 11 },
  streakNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 54, lineHeight: 0.85, color: '#e8442f' },
  streakLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.15 },
  iconBtn: { width: 42, height: 42, border: '1.5px solid #e0d6c8', background: '#fff', fontSize: 18, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", color: '#1a1a1a', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, background: '#e0d6c8', margin: '4px 0 24px' },

  // Home
  homeIntro: { marginBottom: 30, textAlign: 'center' },
  homeKicker: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#e8442f', fontWeight: 700, marginBottom: 8 },
  homeTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 34, lineHeight: 0.98, margin: 0, letterSpacing: -1, color: '#1a1a1a' },
  section: { marginBottom: 30 },
  sectionLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.8, fontWeight: 700, color: '#8a8178', marginBottom: 13 },
  targetRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
  dailyGoalLine: { fontFamily: "'Archivo Black', sans-serif", fontSize: 28, lineHeight: 1.05, letterSpacing: -0.6, color: '#1a1a1a', marginBottom: 20, marginTop: 8, textAlign: 'center' },
  primaryTargetBtn: { width: '100%', aspectRatio: 'auto', padding: '26px 0', marginBottom: 26 },
  scaledHeader: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.8, fontWeight: 700, color: '#8a8178', marginBottom: 12, textAlign: 'center' },
  scaledRow: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxWidth: '78%', margin: '0 auto' },
  scaledTargetBtn: { aspectRatio: '1' },
  scaledTargetBtnNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 34, lineHeight: 1 },
  scaledTargetBtnLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.6, fontWeight: 700, marginTop: 5, opacity: 0.7 },
  targetBtn: { aspectRatio: '1', border: '1.5px solid #e0d6c8', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', borderRadius: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  targetBtnNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 42, lineHeight: 1 },
  targetBtnLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.8, fontWeight: 700, marginTop: 5, opacity: 0.7 },
  equipCol: { display: 'flex', flexDirection: 'column', gap: 9 },
  equipBtn: { display: 'grid', gridTemplateColumns: '1fr 26px', alignItems: 'center', gap: 14, padding: '17px 18px', border: '1.5px solid #e0d6c8', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  equipLabel: { fontFamily: "'Archivo Black', sans-serif", fontSize: 15, letterSpacing: 0.3 },
  equipCheck: { width: 24, height: 24, border: '2px solid #d0c6b8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 7 },
  poolHint: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1, color: '#8a8178', marginTop: 10, fontWeight: 700 },
  startBtn: { width: '100%', fontFamily: "'Archivo Black', sans-serif", fontSize: 26, padding: '22px 0', background: 'linear-gradient(135deg, #f25138 0%, #e8442f 100%)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 6px 20px rgba(232,68,47,0.35)', marginBottom: 24, letterSpacing: 1, borderRadius: 16 },

  // Workout
  sessionBadges: { display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' },
  changeLink: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, padding: '7px 12px', background: '#fff', color: '#1a1a1a', border: '1.5px solid #e0d6c8', cursor: 'pointer', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  badge: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, padding: '7px 12px', background: '#1a1a1a', color: '#faf6f0', borderRadius: 8 },

  card: { background: 'linear-gradient(160deg, #2a2a2a 0%, #161616 100%)', color: '#faf6f0', padding: '30px 24px', border: 'none', marginBottom: 20, borderRadius: 20, boxShadow: '0 8px 28px rgba(0,0,0,0.18)' },
  todayLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#ff6b54', fontWeight: 700, marginBottom: 10 },
  exerciseName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 32, lineHeight: 0.96, margin: '0 0 14px', letterSpacing: -0.5 },
  tip: { fontSize: 14, color: '#b5aca2', lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 14 },
  howToLink: { display: 'inline-block', marginTop: 14, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: '#ff6b54', textDecoration: 'none', borderBottom: '1px solid #ff6b54', paddingBottom: 2 },
  counterBlock: { background: '#fff', border: '1.5px solid #e0d6c8', padding: 22, marginBottom: 16, borderRadius: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },

  schemeBar: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#faf6f0', border: '1.5px solid #e0d6c8', padding: '12px 16px', marginBottom: 18, cursor: 'pointer', fontFamily: 'inherit', color: '#1a1a1a', borderRadius: 12 },
  schemeBarLeft: { textAlign: 'left' },
  schemeBarRight: { textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 },
  schemeLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: '#8a8178', fontWeight: 700 },
  schemeName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 17, lineHeight: 1, marginTop: 3 },
  schemeSub: { fontSize: 11, color: '#8a8178' },
  schemeChevron: { fontSize: 13, color: '#8a8178' },
  schemeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7, marginBottom: 18 },
  schemeChip: { border: '1.5px solid #e0d6c8', padding: '11px 9px', textAlign: 'left', fontFamily: 'inherit', borderRadius: 10, background: '#fff' },
  schemeChipLabel: { fontFamily: "'Archivo Black', sans-serif", fontSize: 13, lineHeight: 1 },
  schemeChipSub: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, marginTop: 4, opacity: 0.65 },
  schemeNote: { gridColumn: '1 / -1', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1, textAlign: 'center', color: '#8a8178', padding: '4px 0' },

  counterTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  repsLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, fontWeight: 700, color: '#8a8178', marginBottom: 4 },
  repsValue: { fontFamily: "'Archivo Black', sans-serif", fontSize: 64, lineHeight: 0.9 },
  repsTarget: { color: '#cfc6ba', fontSize: 32 },
  pctBox: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, paddingBottom: 8 },
  pctValue: { fontSize: 20, color: '#1a1a1a' },
  progressTrack: { height: 10, background: '#efe7da', border: 'none', marginBottom: 22, position: 'relative', overflow: 'hidden', borderRadius: 6 },
  progressFill: { height: '100%', transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1), background 0.3s', borderRadius: 6 },

  setGrid: { display: 'grid', gap: 8, marginBottom: 12 },
  setTile: { aspectRatio: '1', border: '1.5px solid #e0d6c8', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', padding: 4, borderRadius: 12, background: '#fff' },
  setTileNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 22, lineHeight: 1 },
  setTileLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: 1, fontWeight: 700, marginTop: 4 },

  btnRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 },
  repBtn: { fontFamily: "'Archivo Black', sans-serif", fontSize: 20, padding: '18px 0', background: 'linear-gradient(135deg, #f25138 0%, #e8442f 100%)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 3px 10px rgba(232,68,47,0.3)', borderRadius: 12 },
  secondaryRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  ghostBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, padding: '13px 0', background: '#fff', color: '#1a1a1a', border: '1.5px solid #e0d6c8', cursor: 'pointer', borderRadius: 10 },
  primaryBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, padding: '13px 0', background: '#1a1a1a', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 10 },
  doneBlock: { textAlign: 'center', padding: '12px 0' },
  doneText: { fontFamily: "'Archivo Black', sans-serif", fontSize: 48, color: '#e8442f', lineHeight: 1 },
  doneSub: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: '#8a8178', margin: '8px 0 16px', fontWeight: 700 },
  footer: { display: 'flex', justifyContent: 'space-between', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: '#8a8178', fontWeight: 700, paddingTop: 14, borderTop: '1px solid #e0d6c8' },

  flash: { position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 100 },
  countdownOverlay: { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 12, 10, 0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 95, cursor: 'pointer', animation: 'fadeIn 0.2s ease' },
  countdownNumber: { fontFamily: "'Archivo Black', sans-serif", fontSize: 220, lineHeight: 1, color: '#fff', textShadow: '0 0 40px rgba(232,68,47,0.6), 0 0 80px rgba(232,68,47,0.3)', letterSpacing: -8, animation: 'countdownTick 1s ease-out forwards' },
  countdownGo: { fontSize: 140, background: 'linear-gradient(135deg, #ffd700 0%, #f25138 50%, #e8442f 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textShadow: 'none', letterSpacing: -4, animation: 'countdownGoIn 0.7s cubic-bezier(.36,.07,.19,.97) forwards' },
  countdownHint: { position: 'absolute', bottom: 60, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase' },
  flashInner: { background: 'linear-gradient(135deg, #f25138 0%, #e8442f 100%)', color: '#fff', padding: '40px 54px', border: 'none', boxShadow: '0 20px 50px rgba(232,68,47,0.45)', textAlign: 'center', animation: 'flashIn 4s ease-out forwards', position: 'relative', zIndex: 1, borderRadius: 24 },
  flashDidIt: { fontFamily: "'Archivo Black', sans-serif", fontSize: 36, lineHeight: 1, letterSpacing: -0.5, marginBottom: 12 },
  flashBig: { fontFamily: "'Archivo Black', sans-serif", fontSize: 88, lineHeight: 0.9 },
  flashSub: { fontFamily: "'JetBrains Mono', monospace", fontSize: 14, letterSpacing: 3, fontWeight: 700, marginTop: 8 },

  // Sheet
  sheetOverlay: { position: 'fixed', inset: 0, background: 'rgba(20,16,12,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, animation: 'fadeIn 0.2s ease' },
  sheet: { width: '100%', maxWidth: 480, background: '#faf6f0', border: 'none', padding: '22px 20px', maxHeight: '88vh', overflow: 'auto', animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)', borderRadius: '24px 24px 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' },
  sheetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  tabs: { display: 'flex', gap: 4 },
  tab: { fontFamily: "'Archivo Black', sans-serif", fontSize: 15, padding: '7px 13px', background: 'transparent', border: 'none', color: '#c0b6a8', cursor: 'pointer', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6 },
  tabBadge: { background: '#e8442f', color: '#fff', borderRadius: 8, padding: '1px 6px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, minWidth: 18, textAlign: 'center' },
  tabActive: { color: '#1a1a1a', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  sheetTitleSolo: { fontFamily: "'Archivo Black', sans-serif", fontSize: 26, color: '#1a1a1a' },
  adminFooter: { marginTop: 20, paddingTop: 16, borderTop: '1px solid #e0d6c8' },

  sheetStats: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20, background: '#fff', padding: '16px 10px', borderRadius: 14, border: '1.5px solid #e0d6c8', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.8, fontWeight: 700, color: '#1a1a1a', marginTop: 18, marginBottom: 13, paddingBottom: 8, borderBottom: '1.5px solid #e0d6c8' },
  sectionCount: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#e8442f' },
  medalGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 8 },
  medal: { display: 'grid', gridTemplateColumns: '44px 1fr', alignItems: 'center', gap: 13, padding: '12px 15px', border: '1.5px solid #e0d6c8', borderRadius: 12 },
  medalIcon: { width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: 18, fontWeight: 700 },
  medalBody: { minWidth: 0 },
  medalLabel: { fontFamily: "'Archivo Black', sans-serif", fontSize: 14, lineHeight: 1, letterSpacing: 0.2 },
  medalSub: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginTop: 4, letterSpacing: 0.5 },
  statNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 30, lineHeight: 1, color: '#e8442f', textAlign: 'center' },
  statLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.2, fontWeight: 700, color: '#8a8178', marginTop: 5, textAlign: 'center' },
  historyList: { display: 'flex', flexDirection: 'column', gap: 2 },
  historyRow: { display: 'grid', gridTemplateColumns: '70px 1fr 50px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e8e0d4', fontSize: 13 },
  historyDate: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 11, color: '#8a8178', letterSpacing: 1 },
  historyEx: { fontWeight: 600, fontSize: 13 },
  historyScheme: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1, color: '#8a8178', marginTop: 2 },
  historyReps: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textAlign: 'right', color: '#e8442f' },
  emptyHistory: { padding: '40px 0', textAlign: 'center', color: '#8a8178', fontSize: 13 },
  accountBlock: { marginTop: 24, padding: '16px', background: '#fff', border: '1.5px solid #e0d6c8', borderRadius: 14, display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
  accountInfo: { minWidth: 0 },
  accountName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 14, lineHeight: 1.1 },
  accountEmail: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#8a8178', marginTop: 3, letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },

  bigAddBtn: { width: '100%', fontFamily: "'Archivo Black', sans-serif", fontSize: 17, padding: '17px 0', background: 'linear-gradient(135deg, #f25138 0%, #e8442f 100%)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(232,68,47,0.3)', marginBottom: 24, letterSpacing: 1, borderRadius: 14 },
  addForm: { border: '1.5px solid #e0d6c8', padding: 18, marginBottom: 24, background: '#fff', borderRadius: 14 },
  formLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, fontWeight: 700, color: '#8a8178', marginBottom: 6 },
  formHelp: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#8a8178', marginTop: -8, marginBottom: 12, fontStyle: 'italic' },
  nameInput: { fontFamily: "'Archivo Black', sans-serif", fontSize: 18, padding: '11px 14px', border: '1.5px solid #e0d6c8', background: '#faf6f0', letterSpacing: 0.5, textTransform: 'uppercase', borderRadius: 10 },
  formEquipRow: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  formEquipChip: { padding: '9px 12px', border: '1.5px solid #e0d6c8', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', borderRadius: 8 },
  tipInput: { width: '100%', fontSize: 14, padding: '11px 14px', border: '1.5px solid #e0d6c8', background: '#faf6f0', marginBottom: 12, borderRadius: 10 },
  formButtons: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  errorText: { color: '#e8442f', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, marginBottom: 10 },

  movesHeader: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.8, fontWeight: 700, color: '#1a1a1a', marginTop: 8, marginBottom: 10, paddingBottom: 8, borderBottom: '1.5px solid #e0d6c8' },
  emptyMoves: { padding: '20px 0', textAlign: 'center', color: '#8a8178', fontSize: 12, fontStyle: 'italic' },
  moveRow: { display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid #e8e0d4' },
  moveBody: { minWidth: 0 },
  moveName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 14, lineHeight: 1.1 },
  moveMeta: { fontSize: 10, color: '#8a8178', marginTop: 3, lineHeight: 1.3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 0.5 },
  deleteBtn: { width: 34, height: 34, border: '1.5px solid #e0d6c8', background: '#fff', fontSize: 13, cursor: 'pointer', color: '#8a8178', fontFamily: 'inherit', borderRadius: 9 },
  toggleBtn: { minWidth: 52, padding: '7px 11px', border: '1.5px solid #e0d6c8', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', borderRadius: 7 },

  // Auth screen
  authFrame: { maxWidth: 420, margin: '0 auto', padding: '32px 4px', display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  authBrand: { marginTop: 24, marginBottom: 40, textAlign: 'center' },
  authKicker: { fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: 3, color: '#e8442f', fontWeight: 700, marginBottom: 16 },
  authTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 34, lineHeight: 1.08, margin: 0, letterSpacing: -1, color: '#1a1a1a' },
  appleBtn: { width: '100%', padding: '17px 0', background: '#1a1a1a', color: '#fff', border: 'none', fontFamily: "'Archivo Black', sans-serif", fontSize: 14, letterSpacing: 1, cursor: 'pointer', borderRadius: 14, marginBottom: 10, boxShadow: '0 4px 14px rgba(26,26,26,0.25)' },
  googleBtn: { width: '100%', padding: '17px 0', background: '#fff', color: '#1a1a1a', border: '1.5px solid #e0d6c8', fontFamily: "'Archivo Black', sans-serif", fontSize: 14, letterSpacing: 1, cursor: 'pointer', borderRadius: 14, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  authDivider: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' },
  authDividerLine: { flex: 1, height: 1, background: '#e0d6c8' },
  authDividerText: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 2, color: '#8a8178', fontWeight: 700 },
  emailBtn: { width: '100%', padding: '17px 0', background: 'linear-gradient(135deg, #f25138 0%, #e8442f 100%)', color: '#fff', border: 'none', fontFamily: "'Archivo Black', sans-serif", fontSize: 14, letterSpacing: 1, cursor: 'pointer', borderRadius: 14, marginBottom: 10, boxShadow: '0 4px 14px rgba(232,68,47,0.3)' },
  authTextLink: { width: '100%', padding: '12px 0', background: 'transparent', color: '#1a1a1a', border: 'none', fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', marginTop: 4 },
  authBackLink: { width: '100%', padding: '8px 0', background: 'transparent', color: '#8a8178', border: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1, fontWeight: 700, cursor: 'pointer', marginTop: 6 },
  authFinePrint: { textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1, color: '#8a8178', marginTop: 'auto', paddingTop: 24 },
  authForm: { background: '#fff', border: '1.5px solid #e0d6c8', borderRadius: 18, padding: 22, marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  authFormTitle: { fontFamily: "'Archivo Black', sans-serif", fontSize: 22, marginBottom: 16, letterSpacing: -0.3 },
  authLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: 1.5, fontWeight: 700, color: '#8a8178', marginBottom: 6, marginTop: 4 },
  authInput: { width: '100%', fontFamily: 'inherit', fontSize: 15, padding: '13px 15px', border: '1.5px solid #e0d6c8', background: '#faf6f0', marginBottom: 14, borderRadius: 10 },
  authErrorText: { color: '#e8442f', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, marginBottom: 12 },
  authSubmitBtn: { width: '100%', padding: '17px 0', background: '#1a1a1a', color: '#fff', border: 'none', fontFamily: "'Archivo Black', sans-serif", fontSize: 14, letterSpacing: 1, cursor: 'pointer', borderRadius: 14, boxShadow: '0 4px 14px rgba(26,26,26,0.25)' },

  // Friends UI
  subtabRow: { display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 },
  subtab: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1.2, padding: '9px 13px', border: '1.5px solid #e0d6c8', cursor: 'pointer', borderRadius: 8, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 },
  subtabBadge: { background: '#e8442f', color: '#fff', borderRadius: 6, padding: '1px 5px', fontSize: 9, fontWeight: 700 },
  emptyFriends: { padding: '32px 16px', textAlign: 'center', color: '#8a8178', fontSize: 13, fontStyle: 'italic' },
  leaderRow: { display: 'grid', gridTemplateColumns: '34px 1fr auto auto', alignItems: 'center', gap: 10, padding: '11px 12px', borderBottom: '1px solid #e8e0d4', borderRadius: 10 },
  leaderRank: { fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: '#e8442f', textAlign: 'center' },
  leaderBody: { minWidth: 0 },
  leaderName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 14, lineHeight: 1.1 },
  leaderHandle: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#8a8178', marginTop: 2 },
  leaderStreak: { textAlign: 'right', lineHeight: 1 },
  leaderStreakNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 22, color: '#1a1a1a', display: 'block' },
  leaderStreakLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: '#8a8178', letterSpacing: 1, fontWeight: 700 },
  requestRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '11px 0', borderBottom: '1px solid #e8e0d4' },
  acceptBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '9px 13px', background: 'linear-gradient(135deg, #f25138 0%, #e8442f 100%)', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 8, boxShadow: '0 2px 8px rgba(232,68,47,0.25)' },
  declineBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, padding: '9px 11px', background: '#fff', color: '#1a1a1a', border: '1.5px solid #e0d6c8', cursor: 'pointer', borderRadius: 8 },
  smallGhostBtn: { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: '7px 11px', background: '#fff', color: '#1a1a1a', border: '1.5px solid #e0d6c8', cursor: 'pointer', borderRadius: 8 },
  helpText: { fontSize: 12, color: '#8a8178', lineHeight: 1.45, marginBottom: 16, padding: '12px 14px', background: '#fff', borderRadius: 12, border: '1.5px solid #e0d6c8' },
  memberPickRow: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 15px', border: '1.5px solid #e0d6c8', cursor: 'pointer', borderRadius: 10, marginBottom: 6, fontFamily: 'inherit', fontSize: 14, fontWeight: 600 },
  squadCard: { background: '#fff', border: '1.5px solid #e0d6c8', borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  squadHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  squadName: { fontFamily: "'Archivo Black', sans-serif", fontSize: 18, lineHeight: 1, letterSpacing: -0.3 },
  squadMembers: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#8a8178', marginTop: 4 },
  squadStreakBlock: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'linear-gradient(160deg, #2a2a2a 0%, #161616 100%)', color: '#faf6f0', borderRadius: 12, marginBottom: 12 },
  squadStreakNum: { fontFamily: "'Archivo Black', sans-serif", fontSize: 40, lineHeight: 0.85, color: '#e8442f' },
  squadStreakLabel: { fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: 1.5, fontWeight: 700, lineHeight: 1.2 },
  squadMemberList: { display: 'flex', flexDirection: 'column', gap: 4 },
  squadMemberRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' },
  squadMemberStreak: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#e8442f' },

  loadingWrap: { minHeight: '100vh', background: '#faf6f0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  loadingDot: { width: 16, height: 16, background: '#e8442f', borderRadius: '50%', animation: 'pulse 1.2s ease-in-out infinite' },
};
