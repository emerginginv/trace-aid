import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to manage signed URLs for subject profile and cover images.
 * Caches signed URLs to avoid regenerating them on every render.
 */
export function useSubjectProfileImages(subjects: { id: string; profile_image_url: string | null; cover_image_url?: string | null }[]) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [signedCoverUrls, setSignedCoverUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const generateSignedUrl = useCallback(async (filePath: string): Promise<string | null> => {
    if (!filePath) return null;
    
    // If it's already a data URL, blob URL, or external URL, return as-is
    if (filePath.startsWith('data:') || filePath.startsWith('blob:') || 
        (filePath.startsWith('http') && !filePath.includes('subject-profile-images'))) {
      return filePath;
    }

    // Extract file path if it's a full URL
    let path = filePath;
    const publicPattern = /\/storage\/v1\/object\/public\/subject-profile-images\/(.+?)(?:\?|$)/;
    const signedPattern = /\/storage\/v1\/object\/sign\/subject-profile-images\/(.+?)(?:\?|$)/;
    
    const publicMatch = filePath.match(publicPattern);
    if (publicMatch) {
      path = decodeURIComponent(publicMatch[1]);
    } else {
      const signedMatch = filePath.match(signedPattern);
      if (signedMatch) {
        path = decodeURIComponent(signedMatch[1]);
      }
    }

    // Generate signed URL
    const { data, error } = await supabase.storage
      .from("subject-profile-images")
      .createSignedUrl(path, 3600); // 1 hour expiration

    if (error) {
      console.error("Error creating signed URL:", error);
      return null;
    }

    return data.signedUrl;
  }, []);

  useEffect(() => {
    const loadSignedUrls = async () => {
      const subjectsWithImages = subjects.filter(s => s.profile_image_url || s.cover_image_url);
      if (subjectsWithImages.length === 0) return;

      setLoading(true);
      const newProfileUrls: Record<string, string> = {};
      const newCoverUrls: Record<string, string> = {};

      await Promise.all(
        subjectsWithImages.map(async (subject) => {
          // Generate profile image URL
          if (subject.profile_image_url && !signedUrls[subject.id]) {
            const signedUrl = await generateSignedUrl(subject.profile_image_url);
            if (signedUrl) {
              newProfileUrls[subject.id] = signedUrl;
            }
          }
          
          // Generate cover image URL
          if (subject.cover_image_url && !signedCoverUrls[subject.id]) {
            const signedUrl = await generateSignedUrl(subject.cover_image_url);
            if (signedUrl) {
              newCoverUrls[subject.id] = signedUrl;
            }
          }
        })
      );

      if (Object.keys(newProfileUrls).length > 0) {
        setSignedUrls(prev => ({ ...prev, ...newProfileUrls }));
      }
      if (Object.keys(newCoverUrls).length > 0) {
        setSignedCoverUrls(prev => ({ ...prev, ...newCoverUrls }));
      }
      setLoading(false);
    };

    loadSignedUrls();
  }, [subjects, generateSignedUrl]);

  const getSignedUrl = useCallback((subjectId: string): string | undefined => {
    return signedUrls[subjectId];
  }, [signedUrls]);

  const getCoverUrl = useCallback((subjectId: string): string | undefined => {
    return signedCoverUrls[subjectId];
  }, [signedCoverUrls]);

  const refreshUrl = useCallback(async (subjectId: string, filePath: string) => {
    const signedUrl = await generateSignedUrl(filePath);
    if (signedUrl) {
      setSignedUrls(prev => ({ ...prev, [subjectId]: signedUrl }));
    }
  }, [generateSignedUrl]);

  const refreshCoverUrl = useCallback(async (subjectId: string, filePath: string) => {
    const signedUrl = await generateSignedUrl(filePath);
    if (signedUrl) {
      setSignedCoverUrls(prev => ({ ...prev, [subjectId]: signedUrl }));
    }
  }, [generateSignedUrl]);

  return { signedUrls, signedCoverUrls, getSignedUrl, getCoverUrl, refreshUrl, refreshCoverUrl, loading };
}
