import React, { ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    const isChunkError = this.state.error?.message?.includes('Loading chunk') ||
      this.state.error?.message?.includes('Failed to fetch') ||
      this.state.error?.message?.includes('dynamically imported module') ||
      this.state.error?.name === 'ChunkLoadError';
    if (isChunkError) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  public render() {
    const { hasError, error } = this.state;
    if (hasError) {
      return (
        <div className="fixed inset-0 bg-[#FDF8F6] flex items-center justify-center p-6 z-[999]">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-xl border-2 border-orange-100 text-center">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-orange-500" />
            </div>
            
            <h1 className="text-2xl font-black text-gray-900 mb-3">哎呀，出错了</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              猫咪可能在玩耍时不小心碰断了线，或者发生了一些意料之外的情况。
            </p>

            {import.meta.env.DEV && (
              <div className="mb-8 p-4 bg-red-50 rounded-2xl text-left overflow-auto max-h-40">
                <p className="text-xs font-mono text-red-600 whitespace-pre-wrap">
                  {error?.stack}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReset}
                className="w-full py-4 bg-[#FF9D76] text-white rounded-2xl font-bold shadow-lg shadow-orange-200 flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <RefreshCw size={20} />
                重试一下
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="w-full py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Home size={20} />
                返回首页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
