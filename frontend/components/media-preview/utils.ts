export async function compressImageForPreview(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      
      let { width, height } = img;
      
      if (width <= maxWidth && height <= maxHeight) {
        resolve(URL.createObjectURL(file));
        return;
      }
      
      const aspectRatio = width / height;
      
      if (width > height) {
        if (width > maxWidth) {
          width = maxWidth;
          height = width / aspectRatio;
        }
      } else {
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          
          const compressedUrl = URL.createObjectURL(blob);
          resolve(compressedUrl);
        },
        file.type.startsWith('image/') ? file.type : 'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };
    
    img.src = objectUrl;
  });
}

export async function createVideoThumbnail(
  file: File,
  maxWidth: number = 400,
  maxHeight: number = 400
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    
    video.onloadeddata = () => {
      video.currentTime = 0;
    };
    
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      
      let { videoWidth: width, videoHeight: height } = video;
      const aspectRatio = width / height;
      
      if (width > height) {
        if (width > maxWidth) {
          width = maxWidth;
          height = width / aspectRatio;
        }
      } else {
        if (height > maxHeight) {
          height = maxHeight;
          width = height * aspectRatio;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      ctx.drawImage(video, 0, 0, width, height);
      
      URL.revokeObjectURL(objectUrl);
      video.remove();
      
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create thumbnail'));
            return;
          }
          
          const thumbnailUrl = URL.createObjectURL(blob);
          resolve(thumbnailUrl);
        },
        'image/jpeg',
        0.8
      );
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
      reject(new Error('Failed to load video'));
    };
    
    video.src = objectUrl;
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
