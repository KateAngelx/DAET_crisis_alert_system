"use client";

import { useEffect, useState } from "react";

/** True when the site is running as an installed home-screen app, not a mobile browser tab. */
export function useInstalledApp() {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const update = () => {
      setInstalled(Boolean(media.matches || window.navigator.standalone));
    };
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  return installed;
}
