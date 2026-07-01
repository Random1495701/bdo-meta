'use client'

import * as React from 'react'
import { RotateCcw, AlertTriangle } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App error caught by boundary:', error, errorInfo)
  }

  handleReset = () => {
    // Clear persisted state that might cause the error
    try {
      localStorage.removeItem('bdo-meta-skill-store')
      localStorage.removeItem('bdo-meta-tier-weights-v1')
      localStorage.removeItem('bdo-meta-table-columns')
    } catch {}

    // Reload the page
    window.location.reload()
  }

  handleSoftReset = () => {
    // Just reload without clearing state
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-bdo-ink p-6 text-center">
          <AlertTriangle className="mb-4 size-16 text-amber-500/60" />
          <h1 className="bdo-title mb-2 text-2xl font-bold text-amber-400">
            Application Error
          </h1>
          <p className="mb-1 max-w-md text-sm text-amber-200/60">
            A client-side error occurred. This is often caused by corrupted local state.
          </p>
          <p className="mb-6 max-w-md text-xs text-amber-300/40">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={this.handleSoftReset}
              className="flex items-center gap-2 rounded-sm border border-amber-600/60 bg-amber-900/30 px-4 py-2 text-sm font-bold text-amber-200 transition-all hover:bg-amber-800/40"
            >
              <RotateCcw className="size-4" />
              Reload Page
            </button>
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 rounded-sm border border-red-700/60 bg-red-900/30 px-4 py-2 text-sm font-bold text-red-200 transition-all hover:bg-red-800/40"
            >
              <AlertTriangle className="size-4" />
              Reset App State & Reload
            </button>
          </div>
          <p className="mt-6 text-[10px] text-amber-300/30">
            "Reset App State" clears localStorage (filters, sort preferences, tier weights) and reloads.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}
