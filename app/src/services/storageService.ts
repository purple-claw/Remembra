import { getSupabase, requireAuth } from '@/lib/supabase';
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
    const supabase = getSupabase();
    const userId = await requireAuth();

    const ext = getExtension(file.name, file.type || 'application/octet-stream');
    const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}-${Date.now()}`;
    const objectName = `${Date.now()}-${uuid}.${ext}`;
    const objectPath = `${userId}/${safeName}-${objectName}`;

    const { error: uploadError } = await supabase
      .storage
      .from(MEMORY_IMAGE_BUCKET)
      .upload(objectPath, file, {
        upsert: false,
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
      });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data } = supabase
      .storage
      .from(MEMORY_IMAGE_BUCKET)
      .getPublicUrl(objectPath);

    return {
      type: 'image',
      name: file.name,
      url: data.publicUrl,
      size: file.size,
      path: objectPath,
      bucket: MEMORY_IMAGE_BUCKET,
      mime_type: file.type,
    };
  },

  async removeAttachments(attachments: Attachment[]): Promise<void> {
    const supabase = getSupabase();

    const byBucket: Record<string, string[]> = {};

    for (const attachment of attachments) {
      if (!attachment.path || !attachment.bucket) continue;
      if (!byBucket[attachment.bucket]) {
        byBucket[attachment.bucket] = [];
      }
      byBucket[attachment.bucket].push(attachment.path);
    }

    await Promise.all(
      Object.entries(byBucket).map(async ([bucket, paths]) => {
        if (paths.length === 0) return;
        const { error } = await supabase.storage.from(bucket).remove(paths);
        if (error) {
          console.warn(`Failed to remove objects from bucket ${bucket}:`, error);
        }
      }),
    );
  },
};
