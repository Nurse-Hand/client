import { apiUpload } from './client';

export interface StoredFile {
    id: string;
    kind: 'AUDIO' | 'PHOTO';
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    originalName: string;
    createdAt: string;
}

export function uploadPhoto(uri: string) {
    return apiUpload<StoredFile>('/files/photos', uri, 'image/jpeg', 'photo.jpg');
}

export function uploadAudio(uri: string) {
    return apiUpload<StoredFile>('/files/audio', uri, 'audio/mp4', 'recording.m4a');
}