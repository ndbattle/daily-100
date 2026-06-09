// ============================================================
// EXERCISE LIBRARY
// ============================================================
// Add, edit, or remove exercises here. Save and commit — the app
// picks up changes automatically on next deploy.
//
// Format for each exercise:
//   { name: 'EXERCISE NAME', tip: 'Form note shown to user.', equipment: ['bodyweight'] },
//
// FIELDS:
//   - name      : All caps, in single quotes
//   - tip       : Short form note (keep under ~60 characters)
//   - equipment : Array of one or more of:
//                 'bodyweight', 'dumbbell', 'kettlebell', 'band'
//
// OPTIONAL FIELD:
//   - videoUrl  : Link to a tutorial video. If omitted, the app
//                 falls back to a YouTube search for the name.
//                 Example:
//                 { name: 'BURPEES', tip: '...', equipment: ['bodyweight'],
//                   videoUrl: 'https://youtube.com/watch?v=...' },
//
// RULES:
//   - Each line ends with a comma
//   - Names must be unique across the whole list
//   - Don't delete the [ at the top or the ]; at the bottom
//   - Use single quotes ' not double quotes "
// ============================================================

export const BUILTIN_EXERCISES = [
  // ---- Bodyweight ----
  { name: 'PUSH-UPS', tip: 'Keep core tight. Drop to knees if form breaks.', equipment: ['bodyweight'], videourl: 'https://youtube.com/shorts/U6eTUOOw9Ow?si=brrFprOe7I-aWZom' },
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
  // Add your bodyweight exercises here

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
  // Add your dumbbell exercises here

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
  // Add your kettlebell exercises here

  // ---- Both dumbbell & kettlebell ----
  { name: 'GOBLET SQUATS', tip: 'Hold weight at chest. Elbows brush knees.', equipment: ['dumbbell', 'kettlebell'] },
  { name: 'WEIGHTED LUNGES', tip: 'Counts both legs. Hold weight at sides.', equipment: ['dumbbell', 'kettlebell'] },
  { name: 'WEIGHTED RUSSIAN TWISTS', tip: 'Each side = 1 rep. Lean back, twist.', equipment: ['dumbbell', 'kettlebell'] },
  // Add your multi-equipment exercises here

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
  // Add your resistance band exercises here
];

// ============================================================
// WARMUP LIBRARY
// ============================================================
// Light movements shown before a workout (3 are picked at random).
// These do NOT count toward the user's streak.
//
// Format:
//   { name: 'WARMUP NAME', tip: 'How to do it.', reps: 20 },
//
// FIELDS:
//   - name : All caps
//   - tip  : Short form note
//   - reps : Number of reps for this warmup (varies — usually 10-30)
//
// Add or remove freely. As long as there are at least 3 entries,
// the random picker will find 3 different ones each time.
// ============================================================

export const WARMUP_EXERCISES = [
  { name: 'ARM CIRCLES', tip: 'Slow controlled circles. 10 forward, 10 back.', reps: 20 },
  { name: 'LEG SWINGS', tip: 'Each leg. Forward and side swings. Stay tall.', reps: 20 },
  { name: 'JUMPING JACKS', tip: 'Light on the feet. Get the blood flowing.', reps: 30 },
  { name: 'HIGH KNEES', tip: 'Drive knees up to hip height. Quick steps.', reps: 30 },
  { name: 'BUTT KICKS', tip: 'Heels to glutes. Quick light steps.', reps: 30 },
  { name: 'WALKING LUNGES', tip: 'Each leg. Step forward, back knee down.', reps: 10 },
  { name: 'INCHWORMS', tip: 'Hands walk out to plank, walk feet up.', reps: 8 },
  { name: 'AIR SQUATS', tip: 'Slow and controlled. Hips back, knees out.', reps: 15 },
  { name: 'HIP CIRCLES', tip: 'Hands on hips, big circles each direction.', reps: 10 },
  { name: 'SHOULDER ROLLS', tip: 'Big slow circles. Forward then back.', reps: 10 },
  { name: 'TOE TOUCHES', tip: 'Light bend. Reach for toes, return slow.', reps: 10 },
  { name: 'CAT-COW STRETCH', tip: 'On all fours. Arch then round the spine.', reps: 10 },
  { name: 'TORSO TWISTS', tip: 'Arms loose. Twist side to side, hips still.', reps: 20 },
  { name: 'JUMPING JACKS', tip: 'Light steady pace. Wake everything up.', reps: 25 },
  { name: 'BODY SQUATS', tip: 'Pause at bottom 1 sec. Drive up through heels.', reps: 12 },
  // Add your warmup exercises here
];

// ============================================================
// COOLDOWN LIBRARY
// ============================================================
// Gentle yoga and meditation stretches shown after a workout.
// 2 are picked at random. These do NOT count toward the streak.
//
// Format:
//   { name: 'STRETCH NAME', tip: 'How to do it.', duration: '60 seconds' },
//
// FIELDS:
//   - name     : All caps
//   - tip      : Cues for breath, form, focus
//   - duration : How long to hold (e.g. '30 seconds', '1 minute',
//                'each side · 30 sec')
//
// As long as there are at least 2 entries, the picker finds 2
// different ones each time.
// ============================================================

export const COOLDOWN_EXERCISES = [
  { name: "CHILD'S POSE", tip: 'Knees wide, forehead to floor. Breathe into your back.', duration: '60 seconds' },
  { name: 'SEATED FORWARD FOLD', tip: 'Legs extended. Hinge from the hips. Soft knees ok.', duration: '60 seconds' },
  { name: 'PIGEON POSE', tip: 'One leg forward bent, other extended back. Sink the hips.', duration: 'each side · 45 sec' },
  { name: 'SUPINE TWIST', tip: 'On your back. Knees fall to one side. Arms wide.', duration: 'each side · 45 sec' },
  { name: 'COBRA STRETCH', tip: 'Lying face down. Lift chest. Soft elbows. Slow breath.', duration: '45 seconds' },
  { name: 'BUTTERFLY STRETCH', tip: 'Soles of feet together. Knees fall open. Sit tall.', duration: '60 seconds' },
  { name: "DOWNWARD DOG", tip: 'Hands and feet down, hips high. Pedal feet gently.', duration: '45 seconds' },
  { name: 'STANDING FORWARD FOLD', tip: 'Soft knees. Let your head and arms hang heavy.', duration: '60 seconds' },
  { name: 'SEATED SPINAL TWIST', tip: 'Cross one leg over. Twist gently from the spine.', duration: 'each side · 45 sec' },
  { name: 'LEGS UP THE WALL', tip: 'Lie on your back, legs straight up against a wall.', duration: '2 minutes' },
  { name: 'CORPSE POSE', tip: 'Lie flat. Arms relaxed. Eyes closed. Just breathe.', duration: '2 minutes' },
  { name: 'BOX BREATHING', tip: 'Breathe in 4 sec, hold 4, out 4, hold 4. Repeat.', duration: '2 minutes' },
  { name: 'NECK STRETCH', tip: 'Ear to shoulder slowly. Hand can gently guide.', duration: 'each side · 30 sec' },
  { name: 'STANDING QUAD STRETCH', tip: 'Pull foot toward glute. Knees together, hips forward.', duration: 'each side · 30 sec' },
  { name: 'STANDING CALF STRETCH', tip: 'Step one foot back. Heel down. Press into the calf.', duration: 'each side · 30 sec' },
  // Add your cooldown exercises here
];


