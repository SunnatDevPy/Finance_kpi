import { resolveMutationToast, type MutationToastPayload } from "./mutationToast";

type ToastListener = (payload: MutationToastPayload) => void;

const listeners = new Set<ToastListener>();

export function notifyMutationSuccess(method: string, path: string) {
  const payload = resolveMutationToast(method, path);
  if (!payload) return;
  listeners.forEach((listener) => listener(payload));
}

export function subscribeMutationToasts(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
