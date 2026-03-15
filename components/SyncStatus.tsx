
import React, { useState, useEffect } from 'react';
import { CloudIcon, CloudOffIcon, RefreshCwIcon, CheckCircleIcon } from './Icons';
import { USE_SUPABASE } from '../services/config';

const SyncStatus: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [syncSuccess, setSyncSuccess] = useState(false);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleManualSync = async () => {
        if (!isOnline || isSyncing || !USE_SUPABASE) return;
        
        setIsSyncing(true);
        setSyncSuccess(false);
        
        try {
            // Import fullSync dynamically to avoid circular dependencies
            const { fullSync } = await import('../services/sync-manager');
            await fullSync();
            
            setLastSyncTime(new Date());
            setSyncSuccess(true);
            
            // Hide success indicator after 2 seconds
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
                {isOnline ? (
                    <CloudIcon className="w-4 h-4 text-green-500" />
                ) : (
                    <CloudOffIcon className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs text-gray-500 hidden sm:inline">
                    {isOnline ? 'Online' : 'Offline'}
                </span>
            </div>

            {/* Manual Sync Button */}
            <button 
                onClick={handleManualSync}
                disabled={!isOnline || isSyncing}
                className={`p-1.5 rounded-lg transition-all ${
                    syncSuccess 
                        ? 'bg-green-50 text-green-600' 
                        : 'hover:bg-gray-100 text-gray-600'
                } ${!isOnline || isSyncing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                title={isSyncing ? 'Syncing...' : 'Sync data from cloud'}
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

