import { Component } from "react";

/**
 * Catches render/lifecycle errors anywhere below it so a bug in one screen
 * (e.g. a bad path into match.live.innings[...]) shows a recoverable error
 * card instead of a blank white screen for the whole app.
 *
 * Does NOT catch: errors inside event handlers (those need their own
 * try/catch — React error boundaries never see them), async errors that
 * aren't re-thrown during render, or errors in the boundary's own fallback.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={wrap}>
        <div style={card}>
          <p style={emoji}>⚠️</p>
          <h2 style={title}>Something went wrong</h2>
          <p style={subtitle}>
            {this.props.message ||
              "This screen hit an unexpected error. Your match data is saved — try going back."}
          </p>
          <button type="button" style={button} onClick={this.handleReset}>
            Try again
          </button>
        </div>
      </div>
    );
  }
}

const wrap = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "60px 20px",
};

const card = {
  textAlign: "center",
  maxWidth: 320,
};

const emoji = {
  fontSize: 32,
  margin: "0 0 8px",
};

const title = {
  fontSize: 17,
  fontWeight: 700,
  color: "var(--color-slate-900)",
  margin: "0 0 6px",
};

const subtitle = {
  fontSize: 14,
  color: "var(--color-slate-500)",
  margin: "0 0 20px",
  lineHeight: 1.5,
};

const button = {
  background: "var(--color-indigo-600)",
  color: "white",
  border: "none",
  padding: "12px 24px",
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};
