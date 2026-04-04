import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { requireAuth, storage } from '@/lib/firebase';
import { ErrorCode, createAppError, failure, success, type Result } from '@/lib/errors';
import { logger } from '@/lib/logger';
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
  async uploadImage(file: File): Promise<Result<Attachment>> {
    try {
      const userId = await requireAuth();

      const ext = getExtension(file.name, file.type || 'application/octet-stream');
      const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
      const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Math.random().toString(36).slice(2)}-${Date.now()}`;
      const objectName = `${Date.now()}-${uuid}.${ext}`;
      const objectPath = `${MEMORY_IMAGE_BUCKET}/${userId}/${safeName}-${objectName}`;

      const imageRef = ref(storage, objectPath);

      await uploadBytes(imageRef, file, {
        contentType: file.type || 'application/octet-stream',
      });

      const url = await getDownloadURL(imageRef);

      return success({
        type: 'image',
        name: file.name,
        url,
        size: file.size,
        path: objectPath,
        bucket: MEMORY_IMAGE_BUCKET,
        mime_type: file.type,
      });
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.STORAGE_ERROR,
        message: 'Failed to upload image',
      });
      logger.error('storageService.uploadImage failed', appError as Error);
      return failure(appError);
    }
  },

  async removeAttachments(attachments: Attachment[]): Promise<Result<void>> {
    try {
      const paths = attachments
        .map((attachment) => attachment.path)
        .filter((path): path is string => !!path);

      await Promise.all(paths.map(async (path) => {
        try {
          await deleteObject(ref(storage, path));
        } catch (error) {
          logger.warn(`Failed to remove storage object at ${path}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }));

      return success(undefined);
    } catch (error) {
      const appError = createAppError(error, {
        code: ErrorCode.STORAGE_ERROR,
        message: 'Failed to remove attachments',
      });
      logger.error('storageService.removeAttachments failed', appError as Error);
      return failure(appError);
    }
  },
};
