import { Component } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Unhandled application error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-red-50 p-6 text-center text-red-950 font-sans">
          <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 shadow-soft">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 font-bold text-xl mb-4">🩸</span>
            <h1 className="text-2xl font-extrabold text-red-950">Something went wrong</h1>
            <p className="mt-2 text-sm text-red-900/80">
              An unexpected error occurred while loading this page.
            </p>
            {this.state.error && (
              <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-red-50 p-3 text-left text-xs font-mono text-red-800">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-red-700"
            >
              Reload application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: { background: '#fff', color: '#3D0810', border: '1px solid #FFC2C8', boxShadow: '0 10px 30px -10px rgba(214,40,57,.35)', fontWeight: 600 },
              success: { iconTheme: { primary: '#D62839', secondary: '#fff' } },
              error: { iconTheme: { primary: '#B71C2C', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
