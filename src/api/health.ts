import { apiGet } from './client';

export function checkHealth() {
    return apiGet<{ status: string; timestamp: string }>('/health');
}