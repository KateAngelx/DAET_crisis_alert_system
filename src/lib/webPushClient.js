export const DEDICATED_PUSH_WORKER_PATH = "/push/sw.js";
export const DEDICATED_PUSH_WORKER_SCOPE = "/";

export function usesDedicatedPushWorker() {
  return process.env.NODE_ENV === "development";
}

export function pushWorkerPath() {
  return usesDedicatedPushWorker() ? DEDICATED_PUSH_WORKER_PATH : "/sw.js";
}

export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const agent = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(agent)) return true;
  return /macintosh/i.test(agent) && navigator.maxTouchPoints > 1;
}

export function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function supportsWebPush() {
  return typeof window !== "undefined"
    && window.isSecureContext
    && "Notification" in window
    && "serviceWorker" in navigator
    && "PushManager" in window;
}

export function urlBase64ToUint8Array(value) {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`;
  const decoded = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

export function subscriptionUsesKey(subscription, expectedKey) {
  const existingKey = subscription?.options?.applicationServerKey;
  if (!existingKey) return true;
  const existingBytes = new Uint8Array(existingKey);
  return existingBytes.length === expectedKey.length
    && expectedKey.every((byte, index) => byte === existingBytes[index]);
}

function scriptPath(registration) {
  const scriptUrl = registration.active?.scriptURL
    || registration.waiting?.scriptURL
    || registration.installing?.scriptURL;
  if (!scriptUrl) return "";
  try {
    return new URL(scriptUrl).pathname;
  } catch {
    return "";
  }
}

export async function getPushServiceRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  const target = pushWorkerPath();
  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations.find((registration) => scriptPath(registration) === target) || null;
}

function waitUntilActive(registration) {
  if (registration.active?.state === "activated") return Promise.resolve(registration);
  const worker = registration.installing || registration.waiting || registration.active;
  if (!worker) return Promise.reject(new Error("Push service worker did not install."));
  if (worker.state === "activated") return Promise.resolve(registration);

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Push service worker did not activate. Refresh the page and try again."));
    }, 15000);
    const finish = () => {
      if (worker.state === "activated") {
        window.clearTimeout(timeout);
        worker.removeEventListener("statechange", finish);
        resolve(registration);
      } else if (worker.state === "redundant") {
        window.clearTimeout(timeout);
        worker.removeEventListener("statechange", finish);
        reject(new Error("Push service worker failed to install. Refresh the page and try again."));
      }
    };
    worker.addEventListener("statechange", finish);
    finish();
  });
}

export async function registerPushServiceWorker() {
  const path = pushWorkerPath();
  const dedicated = path === DEDICATED_PUSH_WORKER_PATH;
  if (dedicated) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations
      .filter((registration) => {
        if (scriptPath(registration) !== path) return false;
        try {
          return new URL(registration.scope).pathname !== "/";
        } catch {
          return false;
        }
      })
      .map((registration) => registration.unregister()));
  }

  const registration = await navigator.serviceWorker.register(
    path,
    dedicated ? { scope: DEDICATED_PUSH_WORKER_SCOPE } : undefined
  );
  if (dedicated) return waitUntilActive(registration);
  await navigator.serviceWorker.ready;
  return registration;
}
