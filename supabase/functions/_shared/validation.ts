/**
 * Shared validation schemas and utilities for edge functions
 * Using Zod for runtime type validation
 */

// Simple validation implementation (Zod-like API without the dependency)
// This provides type-safe validation for edge functions

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Escape HTML entities to prevent XSS/injection attacks
 * Converts <, >, &, ", ' to their HTML entity equivalents
 */
export function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * Sanitize HTML content for safe email rendering
 * Allows only a whitelist of safe HTML tags and attributes
 * Strips all script tags, event handlers, and dangerous content
 */
export function sanitizeHtmlForEmail(html: string): string {
  // Define allowed tags for email content
  const allowedTags = new Set([
    'p', 'br', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'img', 'hr', 'blockquote', 'pre', 'code'
  ]);
  
  // Define allowed attributes per tag
  const allowedAttributes: Record<string, Set<string>> = {
    '*': new Set(['style', 'class']),
    'a': new Set(['href', 'title', 'target']),
    'img': new Set(['src', 'alt', 'width', 'height']),
    'td': new Set(['colspan', 'rowspan', 'align', 'valign']),
    'th': new Set(['colspan', 'rowspan', 'align', 'valign']),
    'table': new Set(['border', 'cellpadding', 'cellspacing', 'width']),
  };
  
  // Remove script tags and their content entirely
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove all event handlers (onclick, onerror, onload, etc.)
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, '');
  
  // Remove javascript: and data: URLs in href/src attributes
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'src=""');
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*data:[^"'\s>]*/gi, 'href="#"');
  
  // Remove vbscript: URLs
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*vbscript:[^"'\s>]*/gi, 'href="#"');
  
  // Remove expression() in style attributes (IE CSS expression attacks)
  sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');
  
  // Remove behavior: in styles (IE behavior attacks)
  sanitized = sanitized.replace(/behavior\s*:\s*[^;"}]*/gi, '');
  
  // Remove -moz-binding (Firefox XBL attacks)
  sanitized = sanitized.replace(/-moz-binding\s*:\s*[^;"}]*/gi, '');
  
  // Process tags - remove disallowed ones but keep their text content
  sanitized = sanitized.replace(/<\/?(\w+)([^>]*)>/gi, (match, tagName, attributes) => {
    const tag = tagName.toLowerCase();
    
    // If tag is not allowed, remove the tag but return empty string
    // The text content inside will naturally be preserved
    if (!allowedTags.has(tag)) {
      return '';
    }
    
    // Clean attributes for allowed tags
    if (attributes && attributes.trim()) {
      const cleanedAttrs: string[] = [];
      const attrRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
      let attrMatch;
      
      while ((attrMatch = attrRegex.exec(attributes)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrValue = attrMatch[2] || attrMatch[3] || attrMatch[4] || '';
        
        // Check if attribute is allowed for this tag or globally
        const tagAllowed = allowedAttributes[tag]?.has(attrName) || false;
        const globalAllowed = allowedAttributes['*']?.has(attrName) || false;
        
        if (tagAllowed || globalAllowed) {
          // Additional validation for specific attributes
          if (attrName === 'href' || attrName === 'src') {
            // Only allow http, https, and mailto protocols
            if (!/^(https?:|mailto:|\/|#)/i.test(attrValue)) {
              continue;
            }
          }
          cleanedAttrs.push(`${attrName}="${escapeHtml(attrValue)}"`);
        }
      }
      
      const attrString = cleanedAttrs.length > 0 ? ' ' + cleanedAttrs.join(' ') : '';
      return match.startsWith('</') ? `</${tag}>` : `<${tag}${attrString}>`;
    }
    
    return match.startsWith('</') ? `</${tag}>` : `<${tag}>`;
  });
  
  return sanitized;
}

export function validateEmail(email: unknown): ValidationResult<string> {
  if (typeof email !== 'string') {
    return { success: false, error: 'Email must be a string' };
  }
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length === 0) {
    return { success: false, error: 'Email is required' };
  }
  if (trimmed.length > 255) {
    return { success: false, error: 'Email must be 255 characters or less' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { success: false, error: 'Invalid email format' };
  }
  return { success: true, data: trimmed };
}

export function validateString(
  value: unknown,
  options: { minLength?: number; maxLength?: number; fieldName?: string } = {}
): ValidationResult<string> {
  const { minLength = 0, maxLength = 10000, fieldName = 'Field' } = options;
  
  if (typeof value !== 'string') {
    return { success: false, error: `${fieldName} must be a string` };
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return { success: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  if (trimmed.length > maxLength) {
    return { success: false, error: `${fieldName} must be ${maxLength} characters or less` };
  }
  return { success: true, data: trimmed };
}

export function validateUuid(value: unknown, fieldName = 'ID'): ValidationResult<string> {
  if (typeof value !== 'string') {
    return { success: false, error: `${fieldName} must be a string` };
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return { success: false, error: `${fieldName} must be a valid UUID` };
  }
  return { success: true, data: value };
}

export function validateEnum<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fieldName = 'Value'
): ValidationResult<T> {
  if (typeof value !== 'string') {
    return { success: false, error: `${fieldName} must be a string` };
  }
  if (!allowedValues.includes(value as T)) {
    return { success: false, error: `${fieldName} must be one of: ${allowedValues.join(', ')}` };
  }
  return { success: true, data: value as T };
}

export function validateBoolean(value: unknown, fieldName = 'Value'): ValidationResult<boolean> {
  if (typeof value !== 'boolean') {
    return { success: false, error: `${fieldName} must be a boolean` };
  }
  return { success: true, data: value };
}

export function validateOptional<T>(
  validator: (value: unknown) => ValidationResult<T>,
  value: unknown
): ValidationResult<T | undefined> {
  if (value === undefined || value === null) {
    return { success: true, data: undefined };
  }
  return validator(value);
}

// Validation schemas for edge functions

export const VALID_ROLES = ['admin', 'manager', 'investigator', 'vendor', 'owner'] as const;
export type ValidRole = typeof VALID_ROLES[number];

export interface CreateUserInput {
  email: string;
  fullName: string;
  password: string;
  role: ValidRole;
  organizationId: string;
}

export function validateCreateUserInput(input: unknown): ValidationResult<CreateUserInput> {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Request body must be an object' };
  }
  
  const obj = input as Record<string, unknown>;
  
  const emailResult = validateEmail(obj.email);
  if (!emailResult.success) return { success: false, error: emailResult.error };
  
  const fullNameResult = validateString(obj.fullName, { minLength: 1, maxLength: 100, fieldName: 'Full name' });
  if (!fullNameResult.success) return { success: false, error: fullNameResult.error };
  
  const passwordResult = validateString(obj.password, { minLength: 8, maxLength: 128, fieldName: 'Password' });
  if (!passwordResult.success) return { success: false, error: passwordResult.error };
  
  const roleResult = validateEnum(obj.role, VALID_ROLES, 'Role');
  if (!roleResult.success) return { success: false, error: roleResult.error };
  
  const orgIdResult = validateUuid(obj.organizationId, 'Organization ID');
  if (!orgIdResult.success) return { success: false, error: orgIdResult.error };
  
  return {
    success: true,
    data: {
      email: emailResult.data!,
      fullName: fullNameResult.data!,
      password: passwordResult.data!,
      role: roleResult.data!,
      organizationId: orgIdResult.data!,
    },
  };
}

export interface DeleteUserInput {
  userId: string;
}

export function validateDeleteUserInput(input: unknown): ValidationResult<DeleteUserInput> {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Request body must be an object' };
  }
  
  const obj = input as Record<string, unknown>;
  
  const userIdResult = validateUuid(obj.userId, 'User ID');
  if (!userIdResult.success) return { success: false, error: userIdResult.error };
  
  return {
    success: true,
    data: {
      userId: userIdResult.data!,
    },
  };
}

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  fromName?: string;
  fromEmail?: string;
}

export function validateSendEmailInput(input: unknown): ValidationResult<SendEmailInput> {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Request body must be an object' };
  }
  
  const obj = input as Record<string, unknown>;
  
  const toResult = validateEmail(obj.to);
  if (!toResult.success) return { success: false, error: `To: ${toResult.error}` };
  
  const subjectResult = validateString(obj.subject, { minLength: 1, maxLength: 998, fieldName: 'Subject' });
  if (!subjectResult.success) return { success: false, error: subjectResult.error };
  
  const bodyResult = validateString(obj.body, { minLength: 1, maxLength: 500000, fieldName: 'Body' });
  if (!bodyResult.success) return { success: false, error: bodyResult.error };
  
  const isHtmlResult = validateOptional(
    (v) => validateBoolean(v, 'isHtml'),
    obj.isHtml
  );
  if (!isHtmlResult.success) return { success: false, error: isHtmlResult.error };
  
  const fromNameResult = validateOptional(
    (v) => validateString(v, { minLength: 1, maxLength: 100, fieldName: 'From name' }),
    obj.fromName
  );
  if (!fromNameResult.success) return { success: false, error: fromNameResult.error };
  
  const fromEmailResult = validateOptional(
    (v) => validateEmail(v),
    obj.fromEmail
  );
  if (!fromEmailResult.success) return { success: false, error: `From email: ${fromEmailResult.error}` };
  
  return {
    success: true,
    data: {
      to: toResult.data!,
      subject: subjectResult.data!,
      body: bodyResult.data!,
      isHtml: isHtmlResult.data ?? false,
      fromName: fromNameResult.data,
      fromEmail: fromEmailResult.data,
    },
  };
}

export interface ExecuteImportInput {
  batchId: string;
  organizationId: string;
  userId: string;
  sourceSystemName: string;
  entities: Array<{
    entityType: string;
    records: Array<{
      externalRecordId: string;
      data: Record<string, unknown>;
      sourceData: Record<string, unknown>;
    }>;
  }>;
  mappingConfig: Record<string, unknown>;
}

export function validateExecuteImportInput(input: unknown): ValidationResult<ExecuteImportInput> {
  if (!input || typeof input !== 'object') {
    return { success: false, error: 'Request body must be an object' };
  }
  
  const obj = input as Record<string, unknown>;
  
  const batchIdResult = validateUuid(obj.batchId, 'Batch ID');
  if (!batchIdResult.success) return { success: false, error: batchIdResult.error };
  
  const orgIdResult = validateUuid(obj.organizationId, 'Organization ID');
  if (!orgIdResult.success) return { success: false, error: orgIdResult.error };
  
  const userIdResult = validateUuid(obj.userId, 'User ID');
  if (!userIdResult.success) return { success: false, error: userIdResult.error };
  
  const sourceSystemResult = validateString(obj.sourceSystemName, { minLength: 1, maxLength: 100, fieldName: 'Source system name' });
  if (!sourceSystemResult.success) return { success: false, error: sourceSystemResult.error };
  
  if (!Array.isArray(obj.entities)) {
    return { success: false, error: 'Entities must be an array' };
  }
  
  if (obj.entities.length > 1000) {
    return { success: false, error: 'Too many entity types (max 1000)' };
  }
  
  // Validate each entity group
  for (let i = 0; i < obj.entities.length; i++) {
    const entity = obj.entities[i];
    if (!entity || typeof entity !== 'object') {
      return { success: false, error: `Entity at index ${i} must be an object` };
    }
    
    const entityTypeResult = validateString(entity.entityType, { minLength: 1, maxLength: 50, fieldName: `Entity type at index ${i}` });
    if (!entityTypeResult.success) return { success: false, error: entityTypeResult.error };
    
    if (!Array.isArray(entity.records)) {
      return { success: false, error: `Records at entity index ${i} must be an array` };
    }
    
    if (entity.records.length > 10000) {
      return { success: false, error: `Too many records for entity type ${entity.entityType} (max 10000)` };
    }
  }
  
  if (!obj.mappingConfig || typeof obj.mappingConfig !== 'object') {
    return { success: false, error: 'Mapping config must be an object' };
  }
  
  return {
    success: true,
    data: {
      batchId: obj.batchId as string,
      organizationId: obj.organizationId as string,
      userId: obj.userId as string,
      sourceSystemName: obj.sourceSystemName as string,
      entities: obj.entities as ExecuteImportInput['entities'],
      mappingConfig: obj.mappingConfig as Record<string, unknown>,
    },
  };
}

// Utility to extract client IP from request
export function getClientIp(req: Request): string | null {
  // Check common headers for proxied requests
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  return null;
}

// Utility to get user agent
export function getUserAgent(req: Request): string | null {
  return req.headers.get('user-agent');
}
