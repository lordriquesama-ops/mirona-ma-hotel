
import React, { useState, useEffect } from 'react';
import { CloudIcon, CloudOffIcon, RefreshCwIcon, CheckCircleIcon } from './Icons';
import { USE_SUPABASE } from '../services/config';

const SyncStatus: React.FC = () => {
    const [online, setOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [syncSuccess, setSyncSuccess] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const handleOnline = () => { setOnline(true); checkPending(); };
        const handleOffline = () => setOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Poll pending count every 10s
        checkPending();
        const interval = setInterval(checkPending, 10000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const checkPending = async () => {
        try {
            const { getOfflineQueueCount } = await import('../services/sync-manager');
            const count = await getOfflineQueueCount();
            setPendingCount(count);
        } catch { /* ignore */ }
    };

    const handleManualSync = async () => {
        if (!online || isSyncing || !USE_SUPABASE) return;
        
        setIsSyncing(true);
        setSyncSuccess(false);
        
        try {
            const { flushOfflineQueue, fullSync } = await import('../services/sync-manager');
            await flushOfflineQueue();
            await fullSync();
            setLastSyncTime(new Date());
            setSyncSuccess(true);
            setPendingCount(0);
            setTimeout(() => setSyncSuccess(false), 2000);
        } catch (err: any) {
            console.error('Manual sync failed:', err);
        } finally {
            setIsSyncing(false);
        }
    };

    if (!USE_SUPABASE) return null;

    return (
        <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-1.5">
                {online ? (
                    <CloudIcon className="w-4 h-4 text-green-500" />
                ) : (
                    <CloudOffIcon className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs text-gray-500 hidden sm:inline">
                    {online ? 'Online' : 'Offline'}
                </span>
            </div>

            {/* Pending offline ops badge */}
            {pendingCount > 0 && (
                <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full" title={`${pendingCount} operation(s) pending sync`}>
                    {pendingCount} pending
                </span>
            )}

            {/* Manual Sync Button */}
            <button 
                onClick={handleManualSync}
                disabled={!online || isSyncing}
                className={`p-1.5 rounded-lg transition-all ${
                    syncSuccess 
                        ? 'bg-green-50 text-green-600' 
                        : 'hover:bg-gray-100 text-gray-600'
                } ${!online || isSyncing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                title={isSyncing ? 'Syncing...' : pendingCount > 0 ? `Sync ${pendingCount} pending changes` : 'Sync data from cloud'}
            >
                {syncSuccess ? (
                    <CheckCircleIcon className="w-4 h-4" />
                ) : (
                    <RefreshCwIcon className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                )}
            </button>

            {/* Last Sync Time */}
            {lastSyncTime && (
                <span className="text-[10px] text-gray-400 hidden md:inline">
                    {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}
        </div>
    );
};

export default SyncStatus;

