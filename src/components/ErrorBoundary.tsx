import { Component, ErrorInfo, ReactNode } from "react"; // Removed unused React import

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: _, errorInfo: null }; // Store error but not errorInfo yet
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error: error, errorInfo: errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ padding: "20px", backgroundColor: "#1a1a1a", color: "white", minHeight: "100vh", fontFamily: "sans-serif" }}>
          <h1>Oops! Something went wrong.</h1>
          <p>We are sorry for the inconvenience. Please try refreshing the page, or contact support if the problem persists.</p>
          <details style={{ whiteSpace: "pre-wrap", marginTop: "20px", padding: "10px", backgroundColor: "#333", borderRadius: "4px" }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold" }}>Error Details (for developers)</summary>
            {this.state.error && this.state.error.toString()}
            <br />
            <br />
            <strong>Component Stack:</strong>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

