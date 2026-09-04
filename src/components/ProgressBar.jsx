import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useHeaderHide } from '@/lib/HeaderHideContext';

export default function ProgressBar() {
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(null); // 'loading' | 'success' | 'info' | 'error'
  const [visible, setVisible] = useState(false);
  const { hideHeader } = useHeaderHide();

  useEffect(() => {
    const handleProgress = (e) => {
      const { message: msg, status: st } = e.detail || {};
      // Only show explicit info/error pills (e.g. the online/offline Wifi tap).
      // Update-flow messages ('loading'/'success') are handled silently by the
      // full-screen splash + reload, so we never surface them as a top pill.
      if (msg && (st === 'info' || st === 'error')) {
        setMessage(msg);
        setStatus(st);
        setVisible(true);
      }
    };

    const handleClear = () => {
      setVisible(false);
      setMessage('');
      setStatus(null);
    };

    window.addEventListener('kjb-progress', handleProgress);
    window.addEventListener('kjb-progress-clear', handleClear);

    return () => {
      window.removeEventListener('kjb-progress', handleProgress);
      window.removeEventListener('kjb-progress-clear', handleClear);
    };
  }, []);

  if (!visible || !message) return null;

  const statusConfig = {
    loading: { icon: Loader2, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-900/40' },
    info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-900/40' },
    error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
  };

  const config = statusConfig[status] || statusConfig.loading;
  const Icon = config.icon;

  return (
    <div className={`fixed ${hideHeader ? 'top-4' : 'top-16 sm:top-14'} left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] sm:w-auto sm:min-w-[320px] sm:max-w-md px-4 py-2.5 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 ${config.bg} ${config.border} flex items-center gap-2.5`}>
      <Icon className={`w-4 h-4 shrink-0 ${config.color} ${status === 'loading' ? 'animate-spin' : ''}`} style={{ animationDuration: '1.2s' }} />
      <p className="font-sans text-xs font-medium text-foreground flex-1">{message}</p>
    </div>
  );
}