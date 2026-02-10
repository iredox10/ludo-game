import { useState, useEffect } from 'react';
import './PWAPrompt.css';

export default function PWAPrompt() {
    const [showInstall, setShowInstall] = useState(false);
    const [showUpdate, setShowUpdate] = useState(false);
    const [showOffline, setShowOffline] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        // Listen for PWA install prompt
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show install banner after a small delay
            setTimeout(() => setShowInstall(true), 3000);
        };

        // Listen for SW updates
        const handleSWUpdate = async () => {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        if (newWorker) {
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    setShowUpdate(true);
                                }
                            });
                        }
                    });
                }
            }
        };

        // Offline/Online detection
        const handleOffline = () => setShowOffline(true);
        const handleOnline = () => {
            setShowOffline(false);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        handleSWUpdate();

        // Check initial state
        if (!navigator.onLine) setShowOffline(true);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setShowInstall(false);
    };

    const handleUpdate = () => {
        window.location.reload();
    };

    return (
        <>
            {/* Offline Indicator */}
            {showOffline && (
                <div className="pwa-toast offline-toast">
                    <span className="toast-icon">📡</span>
                    <span className="toast-text">You're offline — game still works!</span>
                </div>
            )}

            {/* Install Prompt */}
            {showInstall && (
                <div className="pwa-toast install-toast">
                    <div className="toast-content">
                        <span className="toast-icon">📲</span>
                        <div className="toast-info">
                            <span className="toast-title">Install Ludo</span>
                            <span className="toast-text">Add to home screen for quick access</span>
                        </div>
                    </div>
                    <div className="toast-actions">
                        <button className="toast-btn install" onClick={handleInstall}>Install</button>
                        <button className="toast-btn dismiss" onClick={() => setShowInstall(false)}>Later</button>
                    </div>
                </div>
            )}

            {/* Update Available */}
            {showUpdate && (
                <div className="pwa-toast update-toast">
                    <div className="toast-content">
                        <span className="toast-icon">🔄</span>
                        <div className="toast-info">
                            <span className="toast-title">Update Available</span>
                            <span className="toast-text">A new version of Ludo is ready</span>
                        </div>
                    </div>
                    <div className="toast-actions">
                        <button className="toast-btn install" onClick={handleUpdate}>Update</button>
                        <button className="toast-btn dismiss" onClick={() => setShowUpdate(false)}>Later</button>
                    </div>
                </div>
            )}
        </>
    );
}
