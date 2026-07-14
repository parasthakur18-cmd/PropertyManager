// Hostezee Service Worker — handles push notifications + grouping + escalation
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "New Notification", body: event.data.text(), url: "/" };
  }

  const isOrder = data.type === "new_order" || data.type === "order_escalation";
  const isUrgent = !!data.urgent || data.type === "order_escalation";
  // All food-order notifications share the same tag so we can group/coalesce them.
  const tag = isOrder ? "food-order" : (data.type || "general");

  const vibratePattern = isUrgent
    ? [400, 150, 400, 150, 400, 150, 400, 150, 400]
    : [200, 100, 200, 100, 200];

  event.waitUntil((async () => {
    // For new orders, group multiple incoming pushes into a single "X new orders"
    // notification so staff aren't spammed when several orders arrive at once.
    if (isOrder) {
      try {
        const existing = await self.registration.getNotifications({ tag });
        const count = existing.length + 1;
        if (count > 1) {
          existing.forEach(n => n.close());
          return self.registration.showNotification(
            isUrgent ? `⚠️ ${count} unacknowledged orders` : `🍽️ ${count} new food orders`,
            {
              body: `${data.body || ""}\nTap to open the Kitchen Panel.`,
              icon: "/assets/logo/hostezee-icon.png",
              badge: "/favicon-32x32.png",
              tag,
              renotify: true,
              requireInteraction: true,
              vibrate: vibratePattern,
              data: { url: "/restaurant" },
            }
          );
        }
      } catch (e) {
        // Fall through to a single notification on any error
      }
    }

    return self.registration.showNotification(data.title || "Hostezee PMS", {
      body: data.body || "",
      icon: "/assets/logo/hostezee-icon.png",
      badge: "/favicon-32x32.png",
      tag,
      renotify: true,
      requireInteraction: true,
      vibrate: vibratePattern,
      data: { url: data.url || "/" },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
