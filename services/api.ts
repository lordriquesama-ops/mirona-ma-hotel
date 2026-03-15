
import { API_BASE_URL, API_TIMEOUT } from './config';

interface RequestOptions extends RequestInit {
    token?: string;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), API_TIMEOUT);

        const token = sessionStorage.getItem('mirona_auth_token');
        
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
        };

        const config: RequestInit = {
            ...options,
            headers,
            signal: controller.signal,
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            clearTimeout(id);

            if (response.status === 401) {
                // Handle unauthorized (e.g., redirect to login)
                console.warn("Unauthorized access. Token might be expired.");
                // Optional: window.location.href = '/login';
            }

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.message || `API Error: ${response.statusText}`);
            }

            // Return empty object for 204 No Content
            if (response.status === 204) {
                return {} as T;
            }

            return await response.json();
        } catch (error: any) {
            clearTimeout(id);
            if (error.name === 'AbortError') {
                throw new Error('Request timed out');
            }
            throw error;
        }
    }

    public get<T>(endpoint: string, options?: RequestOptions) {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    public post<T>(endpoint: string, body: any, options?: RequestOptions) {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    public put<T>(endpoint: string, body: any, options?: RequestOptions) {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    public delete<T>(endpoint: string, options?: RequestOptions) {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const api = new ApiClient(API_BASE_URL);
