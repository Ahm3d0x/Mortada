import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminApp from './admin/AdminApp.tsx';
import AuthScreen from './components/AuthScreen.tsx';
import { gameAuth } from './lib/gameAuth.ts';
import './index.css';

/**
 * Hash-based router with authentication and role protection:
 * - If not logged in → Render AuthScreen
 * - If logged in and #/admin → Check role. If admin → AdminApp, else → redirect to App
 * - Everything else → Game App
 */
function Router() {
  const [route, setRoute] = useState(window.location.hash);
  const [currentUser, setCurrentUser] = useState(gameAuth.getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);

    // Sync auth changes instantly
    const handleAuthChange = () => {
      setCurrentUser(gameAuth.getCurrentUser());
    };
    window.addEventListener('mortada_auth_change', handleAuthChange);

    // Initial check
    setCurrentUser(gameAuth.getCurrentUser());
    setLoading(false);

    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('mortada_auth_change', handleAuthChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-[#020503] text-white select-none">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-400">جاري تحميل نظام الحسابات...</p>
      </div>
    );
  }

  // Not logged in → Auth Screen
  if (!currentUser) {
    return <AuthScreen />;
  }

  // Logged in → Route Protection
  const isAdmin = currentUser.role === 'admin';
  if (route === '#/admin' || route === '#/admin/') {
    if (isAdmin) {
      return <AdminApp />;
    } else {
      // Direct unauthorized user back to main game screen
      window.location.hash = '#/';
      return <App />;
    }
  }

  return <App />;
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);

// Register Service Worker for PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('ServiceWorker registered:', reg))
      .catch((err) => console.error('ServiceWorker registration failed:', err));
  });
}

