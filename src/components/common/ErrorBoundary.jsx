import { Component } from "react";
import { logger } from "../../observability/logger";
import styles from "./ErrorBoundary.module.css";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    logger.error("ui.errorBoundary.caught", {
      error,
      componentStack: info?.componentStack,
      location: window.location.pathname,
    });
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className={styles.wrap}>
        <section className={styles.card} role="alert">
          <div className={styles.icon} aria-hidden="true">
            ⚠️
          </div>
          <h2 className={styles.title}>Something went wrong</h2>
          <p className={styles.subtitle}>
            {this.props.message ||
              "This screen hit an unexpected error. Live matches are saved locally, so retrying is safe."}
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => window.history.back()}
            >
              Go back
            </button>
            <button
              type="button"
              className={styles.primary}
              onClick={this.handleReset}
            >
              Try again
            </button>
          </div>
        </section>
      </main>
    );
  }
}
