import { supabase } from "@/integrations/supabase/client";

/**
 * Get a signed URL for a file in a private storage bucket.
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if there was an error
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Error creating signed URL:", error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Extract the file path from a storage URL (public or signed).
 * @param url - The full storage URL
 * @param bucket - The bucket name to extract from
 * @returns The file path or null if not a valid storage URL
 */
export function extractFilePathFromUrl(url: string, bucket: string): string | null {
  if (!url) return null;
  
  // Handle public URLs: /storage/v1/object/public/{bucket}/{path}
  const publicPattern = new RegExp(`/storage/v1/object/public/${bucket}/(.+?)(?:\\?|$)`);
  const publicMatch = url.match(publicPattern);
  if (publicMatch) {
    return decodeURIComponent(publicMatch[1]);
  }

  // Handle signed URLs: /storage/v1/object/sign/{bucket}/{path}?token=...
  const signedPattern = new RegExp(`/storage/v1/object/sign/${bucket}/(.+?)(?:\\?|$)`);
  const signedMatch = url.match(signedPattern);
  if (signedMatch) {
    return decodeURIComponent(signedMatch[1]);
  }

  // Handle direct paths (when stored as just the path)
  if (!url.startsWith('http') && !url.startsWith('/')) {
    return url;
  }

  return null;
}

/**
 * Get a signed URL for a subject profile image.
 * @param urlOrPath - Either a full URL or just the file path
 * @returns The signed URL or the original URL if not from storage
 */
export async function getSubjectProfileImageUrl(urlOrPath: string | null | undefined): Promise<string | null> {
  if (!urlOrPath) return null;

  // If it's already a data URL or external URL (not from our storage), return as-is
  if (urlOrPath.startsWith('data:') || urlOrPath.startsWith('blob:')) {
    return urlOrPath;
  }

  // Extract file path from URL
  const filePath = extractFilePathFromUrl(urlOrPath, 'subject-profile-images') || urlOrPath;
  
  // If we couldn't extract a path and it's an external URL, return as-is
  if (!filePath && urlOrPath.startsWith('http')) {
    return urlOrPath;
  }

  // Generate a signed URL
  return getSignedUrl('subject-profile-images', filePath, 3600);
}
