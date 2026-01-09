/**
 * Computes a SHA-256 hash of a file for deduplication purposes.
 * @param file - The file to hash
 * @returns A lowercase hexadecimal string of the SHA-256 hash
 */
export async function computeFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
