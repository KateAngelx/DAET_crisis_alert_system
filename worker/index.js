function notificationOptions(payload) {
  const options = {
    body: payload.body || "You have a new notification.",
    icon: "/icons/icon-192.png",
    data: { url: payload.url || "/notifications" },
  };
  if (payload.id) options.tag = String(payload.id);
  return options;
}

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let payload = {};
    if (event.data) {
      try {
        payload = event.data.json();
      } catch {
        payload = { title: "CONNECT-DAET update", body: event.data.text() };
      }
    }

    await self.registration.showNotification(payload.title || "CONNECT-DAET update", notificationOptions(payload));
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const rawPath = event.notification.data?.url || "/notifications";
    const target = new URL(rawPath, self.location.origin);
    if (target.origin !== self.location.origin) return;

    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "navigate" in client) {
        await client.navigate(target.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(target.href);
  })());
});
