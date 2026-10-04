"use client";

import dynamic from "next/dynamic";

// The bell pulls in the Supabase Realtime client and the zod schemas (about 160 KB gzipped).
// Imported lazily, so only signed-in users download it; visitors never render the bell.
// Still rendered on the server, so the button is there before the script arrives.
export const LazyNotificationBell = dynamic(() =>
  import("./notification-bell").then((m) => m.NotificationBell),
);
