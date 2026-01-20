const THUMBNAIL_MAX_SIZE = 200;

export function createThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve('');
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > THUMBNAIL_MAX_SIZE) {
          height = (height * THUMBNAIL_MAX_SIZE) / width;
          width = THUMBNAIL_MAX_SIZE;
        }
      } else {
        if (height > THUMBNAIL_MAX_SIZE) {
          width = (width * THUMBNAIL_MAX_SIZE) / height;
          height = THUMBNAIL_MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve(URL.createObjectURL(blob));
            } else {
              resolve(objectUrl);
            }
          },
          'image/jpeg',
          0.7
        );
      } else {
        resolve(objectUrl);
      }
    };

    img.onerror = () => {
      resolve(objectUrl);
    };

    img.src = objectUrl;
  });
}

export function createVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = 0.1;
    };

    video.onseeked = () => {
      try {
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > height) {
          if (width > THUMBNAIL_MAX_SIZE) {
            height = (height * THUMBNAIL_MAX_SIZE) / width;
            width = THUMBNAIL_MAX_SIZE;
          }
        } else {
          if (height > THUMBNAIL_MAX_SIZE) {
            width = (width * THUMBNAIL_MAX_SIZE) / height;
            height = THUMBNAIL_MAX_SIZE;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(objectUrl);
              if (blob) {
                resolve(URL.createObjectURL(blob));
              } else {
                resolve('');
              }
            },
            'image/jpeg',
            0.7
          );
        } else {
          URL.revokeObjectURL(objectUrl);
          resolve('');
        }
      } catch {
        URL.revokeObjectURL(objectUrl);
        resolve('');
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve('');
    };

    video.src = objectUrl;
  });
}

export async function createThumbnailFromUrl(url: string): Promise<string> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const proxyUrl = `${baseUrl}/media/proxy?url=${encodeURIComponent(url)}`;

    const resp = await fetch(proxyUrl);
    if (!resp.ok) return '';
    const blob = await resp.blob();
    if (!blob.type.startsWith('image/')) return '';

    const file = new File([blob], 'draft-image', { type: blob.type });
    return await createThumbnail(file);
  } catch {
    return '';
  }
}
