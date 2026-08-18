import { useEffect, useState } from 'react';

export function OfflineBanner() {
  const [online, setOnline] = useState(() => window.navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online) return null;
  return (
    <div className="offline-banner">
      You are offline. Internet connection is required to record attendance or refresh data.
    </div>
  );
}
