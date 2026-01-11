import React from "react";
import { 
  Facebook, 
  Instagram, 
  Twitter,
  Linkedin, 
  Youtube,
  MessageCircle,
  Link as LinkIcon,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SocialPlatform = 
  | 'facebook' 
  | 'instagram' 
  | 'x' 
  | 'linkedin' 
  | 'tiktok' 
  | 'snapchat' 
  | 'youtube' 
  | 'reddit' 
  | 'whatsapp' 
  | 'telegram' 
  | 'other';

interface PlatformConfig {
  value: SocialPlatform;
  label: string;
  icon: React.ElementType;
  color?: string;
}

// Custom icons for platforms not in Lucide
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const SnapchatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03a4.72 4.72 0 0 1-.89-.091c-.373-.059-.87-.165-1.504-.165-.479 0-.898.063-1.258.148-.539.12-1.068.359-1.547.614-.779.42-1.555.883-2.878.883a4.89 4.89 0 0 1-.285-.015c-1.278-.015-2.041-.451-2.79-.855-.42-.239-.89-.51-1.399-.629-.239-.059-.509-.09-.839-.09-.21 0-.42.015-.614.045-.24.029-.45.074-.689.089h-.061c-.27 0-.435-.135-.51-.39a3.67 3.67 0 0 1-.135-.569c-.046-.195-.105-.42-.166-.555-1.858-.281-2.906-.69-3.146-1.26a.503.503 0 0 1-.045-.225c-.015-.239.165-.465.42-.509 3.264-.539 4.731-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809a4.04 4.04 0 0 1-.345-.12c-.867-.34-1.258-.75-1.212-1.197 0-.36.284-.69.733-.839.15-.06.314-.089.495-.089.135 0 .329.016.494.104.39.195.734.301 1.033.301.186 0 .3-.045.39-.08-.007-.166-.019-.33-.03-.51l-.003-.06c-.104-1.628-.23-3.654.299-4.847C7.86 1.069 11.215.793 12.206.793"/>
  </svg>
);

const RedditIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
  </svg>
);

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const TelegramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

export const SOCIAL_PLATFORMS: PlatformConfig[] = [
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'x', label: 'X (Twitter)', icon: Twitter },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'tiktok', label: 'TikTok', icon: TikTokIcon },
  { value: 'snapchat', label: 'Snapchat', icon: SnapchatIcon },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'reddit', label: 'Reddit', icon: RedditIcon },
  { value: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon },
  { value: 'telegram', label: 'Telegram', icon: TelegramIcon },
  { value: 'other', label: 'Other Link', icon: LinkIcon },
];

/**
 * Fixed domain rules for deterministic URL-to-icon mapping
 * Domain matching is case-insensitive and strips 'www.' prefix
 */
const DOMAIN_RULES: Record<Exclude<SocialPlatform, 'other'>, string[]> = {
  facebook: ['facebook.com'],
  instagram: ['instagram.com'],
  x: ['x.com', 'twitter.com'],
  linkedin: ['linkedin.com'],
  tiktok: ['tiktok.com'],
  snapchat: ['snapchat.com'],
  youtube: ['youtube.com', 'youtu.be'],
  reddit: ['reddit.com'],
  whatsapp: ['wa.me', 'whatsapp.com'],
  telegram: ['t.me', 'telegram.me'],
};

/**
 * Parse a URL and return the matching social platform based on domain rules.
 * Returns 'other' if no match is found.
 * Does NOT guess from usernames or scrape metadata - strict domain matching only.
 */
export const getPlatformFromUrl = (url: string): SocialPlatform => {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    for (const [platform, domains] of Object.entries(DOMAIN_RULES)) {
      if (domains.some(d => hostname === d || hostname.endsWith('.' + d))) {
        return platform as SocialPlatform;
      }
    }
  } catch {
    // Invalid URL - return 'other'
  }
  return 'other';
};

export const getPlatformConfig = (platform: SocialPlatform): PlatformConfig => {
  return SOCIAL_PLATFORMS.find(p => p.value === platform) || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];
};

interface SocialLinkIconProps {
  platform: SocialPlatform;
  url: string;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const SocialLinkIcon = ({ 
  platform, 
  url, 
  label,
  className,
  size = "md"
}: SocialLinkIconProps) => {
  const config = getPlatformConfig(platform);
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6"
  };

  const buttonSizeClasses = {
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5"
  };

  // Build tooltip text: Platform name or custom label, plus full URL
  const tooltipText = `${label || config.label}\n${url}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={tooltipText}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground",
        "hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors",
        buttonSizeClasses[size],
        className
      )}
    >
      <Icon className={sizeClasses[size]} />
    </a>
  );
};

interface SocialLinkButtonProps {
  platform: SocialPlatform;
  url: string;
  label?: string;
  className?: string;
}

export const SocialLinkButton = ({ 
  platform, 
  url, 
  label,
  className 
}: SocialLinkButtonProps) => {
  const config = getPlatformConfig(platform);
  const Icon = config.icon;
  const displayLabel = label || config.label;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card",
        "text-sm text-foreground hover:bg-accent hover:border-accent transition-colors group",
        className
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
      <span className="truncate">{displayLabel}</span>
      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
};
