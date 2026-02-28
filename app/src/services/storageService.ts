import { storage, requireAuth } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Attachment } from '@/types';

export const MEMORY_IMAGE_BUCKET = 'memory-images';

const sanitizeFileName = (name: string): string => {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-');
};

const getExtension = (name: string, mimeType: string): string => {
  const fromName = name.includes('.') ? name.split('.').pop() || '' : '';
  if (fromName) return fromName;

  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('webp')) return 'webp';
  return 'bin';
};

export const storageService = {
  async uploadImage(file: File): Promise<Attachment> {
    const userId = requireAuth();

    const ext = getExtension(file.name, file.type || 'application/octet-stream');
    const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const objectName = `${Date.now()}-${uuid}.${ext}`;
    const objectPath = `${MEMORY_IMAGE_BUCKET}/${userId}/${safeName}-${objectName}`;

    const storageRef = ref(storage, objectPath);

    await uploadBytes(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
      cacheControl: 'public, max-age=3600',
    });

    const publicUrl = await getDownloadURL(storageRef);

    return {
      type: 'image',
      name: file.name,
      url: publicUrl,
      size: file.size,
      path: objectPath,
      bucket: MEMORY_IMAGE_BUCKET,
      mime_type: file.type,
    };
  },

  async removeAttachments(attachments: Attachment[]): Promise<void> {
    for (const attachment of attachments) {
      if (!attachment.path) continue;
      try {
        const storageRef = ref(storage, attachment.path);
        await deleteObject(storageRef);
      } catch (error) {
        console.warn(`Failed to remove object ${attachment.path}:`, error);
      }
    }
  },
};
