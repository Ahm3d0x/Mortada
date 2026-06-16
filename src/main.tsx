import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminApp from './admin/AdminApp.tsx';
import './index.css';

/**
 * Hash-based router:
 * - #/admin → Admin Dashboard
 * - Everything else → Game
 */
function Router() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (route === '#/admin' || route === '#/admin/') {
    return <AdminApp />;
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);
