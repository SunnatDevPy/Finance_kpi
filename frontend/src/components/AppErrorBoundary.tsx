import { Component, type ErrorInfo, type ReactNode } from "react";
import { isRecoverableLoadError, scheduleAutoReload } from "../lib/runtimeRecovery";
import { AppRecoveryFallback } from "./AppRecoveryFallback";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[WTMA] App error:", error, info.componentStack);

    if (isRecoverableLoadError(error)) {
      scheduleAutoReload("error-boundary-chunk");
    }
  }

  render() {
    if (this.state.hasError) {
      return <AppRecoveryFallback />;
    }

    return this.props.children;
  }
}
