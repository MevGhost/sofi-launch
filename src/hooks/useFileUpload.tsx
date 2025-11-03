'use client';

import { useState, useCallback } from 'react';
import { API_ENDPOINTS, getAuthHeaders } from '@/lib/api/config';
import { showToast } from '@/components/ToastProvider';

interface UploadResult {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  url: string;
}

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadTokenImage = useCallback(async (file: File): Promise<UploadResult | null> => {
    if (!file) {
      showToast.error('No file selected');
      return null;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast.error('Only image files are allowed');
      return null;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast.error('File size must be less than 5MB');
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                showToast.success('Image uploaded successfully');
                resolve(response.data);
              } else {
                showToast.error(response.error || 'Upload failed');
                reject(new Error(response.error));
              }
            } catch (error) {
              showToast.error('Invalid response from server');
              reject(error);
            }
          } else {
            showToast.error(`Upload failed with status ${xhr.status}`);
            reject(new Error(`HTTP ${xhr.status}`));
          }
          setIsUploading(false);
          setUploadProgress(0);
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          showToast.error('Network error during upload');
          reject(new Error('Network error'));
          setIsUploading(false);
          setUploadProgress(0);
        });

        // Get auth headers
        const headers = getAuthHeaders();
        
        // Open and send request
        xhr.open('POST', API_ENDPOINTS.upload.tokenImage);
        
        // Set auth header if available
        if (headers['Authorization']) {
          xhr.setRequestHeader('Authorization', headers['Authorization'] as string);
        }
        
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Upload error:', error);
      showToast.error('Failed to upload image');
      setIsUploading(false);
      setUploadProgress(0);
      return null;
    }
  }, []);

  const deleteTokenImage = useCallback(async (filename: string): Promise<boolean> => {
    try {
      const response = await fetch(API_ENDPOINTS.upload.deleteImage(filename), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();
      
      if (data.success) {
        showToast.success('Image deleted successfully');
        return true;
      } else {
        showToast.error(data.error || 'Failed to delete image');
        return false;
      }
    } catch (error) {
      console.error('Delete error:', error);
      showToast.error('Failed to delete image');
      return false;
    }
  }, []);

  return {
    uploadTokenImage,
    deleteTokenImage,
    isUploading,
    uploadProgress,
  };
}