import React, { StrictMode, Component, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    console.error("Uncaught error in App:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          padding: '20px',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}>
          <h2 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: 'bold' }}>JOXIQ AI Recovered from a Display Issue</h2>
          <p style={{ color: '#94a3b8', marginBottom: '20px', maxWidth: '500px', fontSize: '14px', lineHeight: '1.5' }}>
            {this.state.error?.message || "An unexpected rendering glitch occurred."}
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("gemini_conversations");
              window.location.reload();
            }}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Reload JOXIQ AI
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

