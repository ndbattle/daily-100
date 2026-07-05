/* Daily 100 — Firebase Cloud Messaging service worker
 *
 * This file MUST live at: public/firebase-messaging-sw.js
 * It is served from the site root as /firebase-messaging-sw.js
 * (Vite copies everything in public/ to the root on build.)
 *
 * It runs in the background — even when the app/tab is closed — and shows
 * the notification when a push arrives.
 *
 * ⚠️ REPLACE THE CONFIG BELOW with the values from your src/firebase.js.
 *    The service worker can't import your app code, so the config has to be
 *    pasted in here directly. Use the SAME values that are in firebaseConfig
 *    in src/firebase.js — apiKey, authDomain, projectId, etc.
 *
 *    Note: it's normal and safe for these values to be public. The apiKey
 *    here is not a secret — your Firestore security rules are what protect
 *    your data.
 */

// Compat build — service workers can't use ES module imports, so we load
// Firebase's compat scripts from the CDN. Keep the version in sync-ish with
// the firebase package in your app (v10.x works fine here).
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ⬇️⬇️⬇️ PASTE YOUR CONFIG VALUES HERE (copy from src/firebase.js) ⬇️⬇️⬇️
firebase.initializeApp({
  apiKey: 'REPLACE_WITH_YOUR_API_KEY',
  authDomain: 'REPLACE_WITH_YOUR_AUTH_DOMAIN',
  projectId: 'REPLACE_WITH_YOUR_PROJECT_ID',
  storageBucket: 'REPLACE_WITH_YOUR_STORAGE_BUCKET',
  messagingSenderId: 'REPLACE_WITH_YOUR_SENDER_ID',
  appId: 'REPLACE_WITH_YOUR_APP_ID',
});
// ⬆️⬆️⬆️ PASTE YOUR CONFIG VALUES HERE ⬆️⬆️⬆️

const messaging = firebase.messaging();

// Fired when a push arrives while the app is in the background or closed.
// The Cloud Functions will send a `notification` payload (title + body),
// and optionally a `data` payload we can use for click-through.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'Daily 100';
  const body =
    (payload.notification && payload.notification.body) ||
    "Time for today's 100.";

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',       // optional — falls back to browser default if missing
    badge: '/icon-192.png',      // optional
    tag: (payload.data && payload.data.tag) || 'daily100',
    data: { url: (payload.data && payload.data.url) || '/' },
  });
});

// When the user taps the notification, focus an existing tab if one is open,
// otherwise open the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
