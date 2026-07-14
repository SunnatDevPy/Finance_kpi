import { useCallback, useEffect, useState } from "react";

const DISMISS_KEY = "wtma.pwa.installDismissed";

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });
  const [standalone, setStandalone] = useState(isStandaloneMode);

  useEffect(() => {
    const onInstallable = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onDisplayMode = () => setStandalone(isStandaloneMode());

    window.addEventListener("beforeinstallprompt", onInstallable);
    window.matchMedia("(display-mode: standalone)").addEventListener("change", onDisplayMode);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallable);
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", onDisplayMode);
    };
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    window.localStorage.setItem(DISMISS_KEY, "1");
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      setStandalone(true);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    canInstall: Boolean(deferredPrompt) && !dismissed && !standalone,
    install,
    dismiss,
    isStandalone: standalone,
  };
}
