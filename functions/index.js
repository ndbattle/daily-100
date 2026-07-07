const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const { DateTime } = require('luxon');

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const STALE_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
]);

// Keep in sync with EMOJI_REACTIONS in src/App.jsx.
const EMOJI_BY_KEY = {
  fire: '🔥',
  muscle: '💪',
  clap: '🙌',
  bolt: '⚡',
};

// Sends `payload` to every token for `uid`, removing any tokens the
// send reports as dead so they don't pile up in Firestore.
async function sendToUserTokens(uid, tokens, payload) {
  if (!tokens || tokens.length === 0) return;

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data || {},
  });

  const staleTokens = [];
  response.responses.forEach((res, idx) => {
    if (!res.success && STALE_TOKEN_CODES.has(res.error && res.error.code)) {
      staleTokens.push(tokens[idx]);
    }
  });

  if (staleTokens.length > 0) {
    await db.collection('users').doc(uid).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...staleTokens),
    });
  }
}

exports.hourlyReminder = onSchedule(
  { schedule: '0 * * * *', timeZone: 'Etc/UTC' },
  async () => {
    const snapshot = await db
      .collection('users')
      .where('notificationsEnabled', '==', true)
      .get();

    let checked = 0;
    let sent = 0;

    for (const doc of snapshot.docs) {
      checked++;
      const uid = doc.id;
      const user = doc.data();

      try {
        const tokens = user.fcmTokens;
        const timezone = user.timezone;
        if (!tokens || tokens.length === 0 || !timezone) continue;

        const localNow = DateTime.now().setZone(timezone);
        if (!localNow.isValid || localNow.hour !== 18) continue;

        const localToday = localNow.toFormat('yyyy-MM-dd');
        if (user.lastCompletedDate === localToday) continue;

        await sendToUserTokens(uid, tokens, {
          title: 'Daily 100',
          body: "You haven't done today's 100 yet. Keep your streak alive.",
          data: { url: '/' },
        });
        sent++;
      } catch (err) {
        logger.error(`hourlyReminder: failed for user ${uid}`, err);
      }
    }

    logger.info(`6pm reminder: checked ${checked} users, sent ${sent}`);
  }
);

exports.squadCompletionPush = onDocumentUpdated('squads/{squadId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return;

  // The daily reset happens inline in the same write as the day's first
  // completion, so a completedTodayDate change means yesterday's completions
  // don't count as "before" for diffing — everyone in today's list is new.
  const dateChanged = before.completedTodayDate !== after.completedTodayDate;
  const beforeCompleted = dateChanged ? [] : (before.completedToday || []);
  const afterCompleted = after.completedToday || [];
  const newlyCompleted = afterCompleted.filter((uid) => !beforeCompleted.includes(uid));
  if (newlyCompleted.length === 0) return;

  const memberUids = after.memberUids || [];
  const memberNames = after.memberNames || {};
  const squadName = after.name || 'Your squad';
  const squadId = event.params.squadId;

  let notified = 0;

  for (const finisherUid of newlyCompleted) {
    const finisherName = memberNames[finisherUid] || 'A squad member';
    const otherUids = memberUids.filter((uid) => uid !== finisherUid);

    for (const uid of otherUids) {
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) continue;

        const user = userDoc.data();
        if (!user.notificationsEnabled) continue;

        const tokens = user.fcmTokens;
        if (!tokens || tokens.length === 0) continue;

        await sendToUserTokens(uid, tokens, {
          title: squadName,
          body: `${finisherName} just crushed today's 100! \u{1F4AA}`,
          data: { url: '/' },
        });
        notified++;
      } catch (err) {
        logger.error(`squadCompletionPush: failed to notify ${uid}`, err);
      }
    }
  }

  logger.info(
    `squad completion push: squad ${squadId}, finishers ${newlyCompleted.length}, notified ${notified}`
  );
});

exports.squadReactionPush = onDocumentUpdated('squads/{squadId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!before || !after) return;

  const beforeReactions = before.reactions || {};
  const afterReactions = after.reactions || {};
  const memberNames = after.memberNames || {};
  const squadName = after.name || 'Your squad';
  const squadId = event.params.squadId;

  let notified = 0;

  for (const [reactionKey, afterReactors] of Object.entries(afterReactions)) {
    // reactionKey format: `${date}__${recipientUid}__${emojiKey}` (see toggleReaction in App.jsx)
    const parts = reactionKey.split('__');
    if (parts.length !== 3) continue;
    const [, recipientUid, emojiKey] = parts;

    const beforeReactors = beforeReactions[reactionKey] || [];
    const newReactors = (afterReactors || []).filter((uid) => !beforeReactors.includes(uid));

    for (const reactorUid of newReactors) {
      if (reactorUid === recipientUid) continue;

      try {
        const userDoc = await db.collection('users').doc(recipientUid).get();
        if (!userDoc.exists) continue;

        const user = userDoc.data();
        if (!user.notificationsEnabled) continue;

        const tokens = user.fcmTokens;
        if (!tokens || tokens.length === 0) continue;

        const reactorName = memberNames[reactorUid] || 'A squad member';
        const emoji = EMOJI_BY_KEY[emojiKey] || '';

        await sendToUserTokens(recipientUid, tokens, {
          title: squadName,
          body: `${reactorName} reacted ${emoji} to your workout today!`,
          data: { url: '/' },
        });
        notified++;
      } catch (err) {
        logger.error(`squadReactionPush: failed to notify ${recipientUid}`, err);
      }
    }
  }

  logger.info(`squad reaction push: squad ${squadId}, notified ${notified}`);
});
