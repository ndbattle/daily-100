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
  { name: 'PUSH-UPS', tip: 'Drop to knees if form breaks. Take breaks to shake out arms.', equipment: ['bodyweight'] },
  { name: 'AIR SQUATS', tip: 'Knees track over toes. Sit back into hips.', equipment: ['bodyweight'] },
  { name: 'JUMPING JACKS', tip: 'Stay light on the balls of your feet.', equipment: ['bodyweight'] },
  { name: 'SIT-UPS', tip: 'Hands behind ears, lead with chest, not neck.', equipment: ['bodyweight'] },
  { name: 'CRUNCHES', tip: 'Lift shoulder blades. Lower back stays planted.', equipment: ['bodyweight'] },
  { name: 'ALTERNATING LUNGES', tip: 'Count each leg. Back knee toward floor.', equipment: ['bodyweight'] },
  { name: 'MOUNTAIN CLIMBERS', tip: 'Plank position. Drive knees towards elbows and show some speed.', equipment: ['bodyweight'] },
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
  { name: 'ZOTTMAN CURLS', tip: 'Lighter dumbbell than you think. This is an arm burn.', equipment: ['dumbbell'] },
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
