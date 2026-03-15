
// Safe access to environment variables
const getApiUrl = () => {
    try {
        // Fix import.meta.env type error by casting to any
        const meta = import.meta as any;
        if (typeof meta !== 'undefined' && meta.env && meta.env.VITE_API_URL) {
            return meta.env.VITE_API_URL;
        }
    } catch (e) {
        // ignore errors if import.meta is not supported
    }
    return 'http://localhost:3001/api';
};

export const API_BASE_URL = getApiUrl();

// Toggle between different backends
export const USE_BACKEND = false; // Disable backend API (not running)
export const USE_SUPABASE = true; // Force Supabase to be enabled

// Request timeout in milliseconds
export const API_TIMEOUT = 30000;

export const ENDPOINTS = {
    AUTH: {
        LOGIN: '/auth/login',
        ME: '/auth/me'
    },
    BOOKINGS: '/bookings',
    ROOMS: '/rooms',
    CATEGORIES: '/categories',
    GUESTS: '/guests',
    STAFF: '/users',
    FINANCE: {
        EXPENSES: '/expenses',
        SERVICES: '/services'
    },
    SETTINGS: '/settings',
    LOGS: '/audit-logs',
    SHIFTS: '/shifts'
};
