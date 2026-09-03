"use client";

import { Component, type ReactNode } from "react";

type ClientErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ClientErrorBoundaryState = {
  hasError: boolean;
};

/** Isolates client-only failures (WebGL, etc.) so they cannot unmount the app shell. */
export class ClientErrorBoundary extends Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  state: ClientErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ClientErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("ClientErrorBoundary caught", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }
    return this.props.children;
  }
}
