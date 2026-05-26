import { useState, useCallback } from 'react';

let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, duration = 2000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return { toasts, addToast };
};

export const ToastContainer = ({ toasts }) => {
  if (!toasts?.length) return null;
  
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className="toast" role="status">
          {t.message}
        </div>
      ))}
    </div>
  );
};