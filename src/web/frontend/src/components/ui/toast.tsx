import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  toast: {
    success: (message: string, options?: { duration?: number; id?: string }) => void;
    error: (message: string, options?: { duration?: number; id?: string; action?: { label: string; onClick: () => void } }) => void;
    info: (message: string, options?: { duration?: number; id?: string }) => void;
    loading: (message: string, options?: { duration?: number; id?: string }) => void;
    dismiss: (id?: string) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [timers, setTimers] = useState<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    // Clear any existing timer for this toast
    setTimers((prev) => {
      const timer = prev.get(id);
      if (timer) {
        clearTimeout(timer);
      }
      const newTimers = new Map(prev);
      newTimers.delete(id);
      return newTimers;
    });
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
    // Clear all timers
    setTimers((prev) => {
      prev.forEach((timer) => clearTimeout(timer));
      return new Map();
    });
  }, []);

  const addToast = useCallback((message: string, type: ToastType, duration = 3000, customId?: string, action?: Toast['action']) => {
    const id = customId || Date.now().toString();
    
    // If a toast with this ID exists, remove it first
    if (customId) {
      removeToast(customId);
    }
    
    const toast: Toast = { id, message, type, duration, action };
    
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      const timer = setTimeout(() => removeToast(id), duration);
      setTimers((prev) => new Map(prev).set(id, timer));
    }
  }, [removeToast]);

  const toast = {
    success: (message: string, options?: { duration?: number; id?: string }) => 
      addToast(message, 'success', options?.duration, options?.id),
    error: (message: string, options?: { duration?: number; id?: string; action?: { label: string; onClick: () => void } }) => 
      addToast(message, 'error', options?.duration, options?.id, options?.action),
    info: (message: string, options?: { duration?: number; id?: string }) => 
      addToast(message, 'info', options?.duration, options?.id),
    loading: (message: string, options?: { duration?: number; id?: string }) => 
      addToast(message, 'loading', options?.duration || 0, options?.id), // loading toasts don't auto-dismiss by default
    dismiss: (id?: string) => {
      if (id) {
        removeToast(id);
      } else {
        dismissAll();
      }
    }
  };

  // Listen for dismiss all event
  useEffect(() => {
    const handleDismissAll = () => dismissAll();
    window.addEventListener('dismiss-all-toasts', handleDismissAll);
    return () => window.removeEventListener('dismiss-all-toasts', handleDismissAll);
  }, [dismissAll]);

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2 p-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 200); // Wait for exit animation
  };

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-600" />,
    error: <AlertCircle className="h-5 w-5 text-red-600" />,
    info: <Info className="h-5 w-5 text-blue-600" />,
    loading: <div className="h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />,
  };

  const styles = {
    success: 'bg-white border-green-200 shadow-lg',
    error: 'bg-white border-red-200 shadow-lg',
    info: 'bg-white border-blue-200 shadow-lg',
    loading: 'bg-white border-gray-200 shadow-lg',
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border pointer-events-auto
        transition-all duration-200 transform
        ${styles[toast.type]}
        ${isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
      `}
      style={{ minWidth: '300px', maxWidth: '500px' }}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            handleClose();
          }}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors px-2"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={handleClose}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// Create a singleton toast instance for non-hook usage
let toastInstance: ToastContextType['toast'] | null = null;
let removeToastInstance: ((id: string) => void) | null = null;

export const setToastInstance = (instance: ToastContextType['toast'], removeToast: (id: string) => void) => {
  toastInstance = instance;
  removeToastInstance = removeToast;
};

// Export toast object for drop-in replacement
export const toast = {
  success: (message: string, options?: { duration?: number; id?: string }) => {
    if (toastInstance) {
      toastInstance.success(message, options);
    } else {
      console.warn('Toast not initialized. Wrap your app with ToastProvider.');
    }
  },
  error: (message: string, options?: { duration?: number; id?: string; action?: { label: string; onClick: () => void } }) => {
    if (toastInstance) {
      toastInstance.error(message, options);
    } else {
      console.warn('Toast not initialized. Wrap your app with ToastProvider.');
    }
  },
  info: (message: string, options?: { duration?: number; id?: string }) => {
    if (toastInstance) {
      toastInstance.info(message, options);
    } else {
      console.warn('Toast not initialized. Wrap your app with ToastProvider.');
    }
  },
  loading: (message: string, options?: { duration?: number; id?: string }) => {
    if (toastInstance) {
      toastInstance.loading(message, options);
    } else {
      console.warn('Toast not initialized. Wrap your app with ToastProvider.');
    }
  },
  dismiss: (id?: string) => {
    if (toastInstance) {
      toastInstance.dismiss(id);
    } else {
      console.warn('Toast not initialized. Wrap your app with ToastProvider.');
    }
  }
};

// Wrapper component to initialize toast instance
export const ToastInitializer: React.FC = () => {
  const { toast: toastFromContext, removeToast } = useToast();
  
  useEffect(() => {
    setToastInstance(toastFromContext, removeToast);
  }, [toastFromContext, removeToast]);

  return null;
};

export default toast;