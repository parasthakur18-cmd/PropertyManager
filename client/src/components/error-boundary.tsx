import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface Props {
  children: React.ReactNode;
}

interface ErrorInfo {
  componentStack: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isChunkError: boolean;
}

function isChunkLoadError(error: Error): boolean {
  const msg = error?.message ?? '';
  const name = error?.name ?? '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('error loading dynamically imported module') ||
    name === 'ChunkLoadError'
  );
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, isChunkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      isChunkError: isChunkLoadError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    if (isChunkLoadError(error)) {
      const key = 'chunk_reload_attempted';
      const alreadyTried = sessionStorage.getItem(key);
      if (!alreadyTried) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(key);
    }

    this.reportError(error, errorInfo);
  }

  reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      await apiRequest('/api/errors', 'POST', {
        errorMessage: error.toString(),
        errorStack: error.stack,
        errorType: error.name,
        componentStack: errorInfo.componentStack,
        page: window.location.pathname,
        browserInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
      });
    } catch (err) {
      console.error('Failed to report error:', err);
    }
  };

  handleReload = () => {
    sessionStorage.removeItem('chunk_reload_attempted');
    window.location.href = '/';
  };

  handleRefresh = () => {
    sessionStorage.removeItem('chunk_reload_attempted');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { isChunkError } = this.state;

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-red-900 dark:text-red-200 mb-2">
                    {isChunkError ? 'Page update available' : 'Oops! Something went wrong'}
                  </h2>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    {isChunkError
                      ? 'The app was updated. Please refresh the page to load the latest version.'
                      : "We've automatically reported this error to our team. They'll fix it soon!"}
                  </p>
                  {!isChunkError && (
                    <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded mb-4 max-h-32 overflow-auto">
                      <code className="text-xs text-red-800 dark:text-red-200 break-words">
                        {this.state.error?.toString()}
                      </code>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {isChunkError && (
                      <Button
                        onClick={this.handleRefresh}
                        className="w-full bg-red-600 hover:bg-red-700"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Page
                      </Button>
                    )}
                    <Button
                      onClick={this.handleReload}
                      variant={isChunkError ? 'outline' : undefined}
                      className={isChunkError ? 'w-full' : 'w-full bg-red-600 hover:bg-red-700'}
                    >
                      Go Back Home
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
