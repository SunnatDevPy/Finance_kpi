const RELOAD_COUNT_KEY = "wtma_recovery_reload_count";
const MAX_AUTO_RELOADS = 3;
const RELOAD_DELAY_MS = 1200;

let reloadScheduled = false;

type WtmaWindow = Window & { __WTMA_HEALTHY__?: boolean };

export function isRecoverableLoadError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : String(error ?? "");
  const normalized = message.toLowerCase();

  return (
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("importing a module script failed") ||
    normalized.includes("error loading dynamically imported module") ||
    normalized.includes("chunkloaderror") ||
    normalized.includes("loading chunk") ||
    normalized.includes("dynamically imported module") ||
    normalized.includes("unable to preload css")
  );
}

export function getRecoveryReloadCount(): number {
  return Number(sessionStorage.getItem(RELOAD_COUNT_KEY) || 0);
}

export function canAutoReload(): boolean {
  return getRecoveryReloadCount() < MAX_AUTO_RELOADS;
}

export function scheduleAutoReload(reason: string): boolean {
  if (reloadScheduled || !canAutoReload()) return false;

  reloadScheduled = true;
  const nextCount = getRecoveryReloadCount() + 1;
  sessionStorage.setItem(RELOAD_COUNT_KEY, String(nextCount));

  console.warn(`[WTMA] Auto-reload (${reason}), attempt ${nextCount}/${MAX_AUTO_RELOADS}`);

  window.setTimeout(() => {
    window.location.reload();
  }, RELOAD_DELAY_MS);

  return true;
}

export function reloadNow(): void {
  window.location.reload();
}

export function clearRecoveryState(): void {
  sessionStorage.removeItem(RELOAD_COUNT_KEY);
  (window as WtmaWindow).__WTMA_HEALTHY__ = true;
  reloadScheduled = false;
}

export function markAppHealthy(): void {
  clearRecoveryState();
}

export function isAppHealthy(): boolean {
  return Boolean((window as WtmaWindow).__WTMA_HEALTHY__);
}

function hasRenderedApp(): boolean {
  const root = document.getElementById("root");
  return Boolean(root && root.childElementCount > 0);
}

export function initRuntimeRecovery(): void {
  window.addEventListener("unhandledrejection", (event) => {
    if (isRecoverableLoadError(event.reason)) {
      event.preventDefault();
      scheduleAutoReload("chunk-rejection");
    }
  });

  window.addEventListener("error", (event) => {
    if (isRecoverableLoadError(event.error ?? event.message)) {
      event.preventDefault();
      scheduleAutoReload("chunk-error");
    }
  });

  // React umuman mount bo'lmasa (oq ekran) — bir necha marta avto reload.
  window.setTimeout(() => {
    if (!isAppHealthy() && !hasRenderedApp()) {
      scheduleAutoReload("white-screen");
    }
  }, 9000);
}

export function lazyWithRetry<T>(factory: () => Promise<T>, retries = 3): () => Promise<T> {
  return async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        return await factory();
      } catch (error) {
        lastError = error;
        if (!isRecoverableLoadError(error)) {
          throw error;
        }
        if (attempt < retries - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
        }
      }
    }

    if (isRecoverableLoadError(lastError) && canAutoReload()) {
      scheduleAutoReload("lazy-chunk");
      return new Promise(() => {
        /* reload kutilmoqda */
      });
    }

    throw lastError;
  };
}
