'use client';

import { Component, type ReactNode } from 'react';
import { ErrorState } from './ui';

// Catches render-time errors in the storefront so a single broken page doesn't
// blank the whole app. Resets on retry.
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Storefront render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorState onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
