import { useState, useCallback } from 'react';
import './Toast.css';

let toastIdCounter = 0;

/**
 * useToast hook — returns [toasts, showToast, ToastContainer].
 *
 * Usage:
 *   const [toasts, showToast, ToastContainer] = useToast();
 *   showToast('Profile claimed!', 'success');
 *   // render <ToastContainer /> in your JSX
 */
export function useToast() {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = ++toastIdCounter;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    function ToastContainer() {
        if (toasts.length === 0) return null;
        return (
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type}`}>
                        <span>{t.message}</span>
                        <button
                            className="toast-close"
                            onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        );
    }

    return [toasts, showToast, ToastContainer];
}
