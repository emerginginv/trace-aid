// Type declarations for pagedjs
// Paged.js is a paged media polyfill library

declare module 'pagedjs' {
  export interface Flow {
    total: number;
    pages: HTMLElement[];
  }

  export interface PreviewerOptions {
    /** CSS class prefix for generated elements */
    classnamePrefix?: string;
    /** Whether to use native CSS Paged Media if available */
    paged?: boolean;
  }

  export class Previewer {
    constructor(options?: PreviewerOptions);
    
    /**
     * Preview paginated content
     * @param content - HTML string or DOM element to paginate
     * @param stylesheets - Array of stylesheet URLs to apply
     * @param renderTo - DOM element to render pages into
     * @returns Promise resolving to the flow information
     */
    preview(
      content: string | HTMLElement,
      stylesheets: string[],
      renderTo: HTMLElement
    ): Promise<Flow>;
  }

  export class Chunker {
    constructor(content: string | HTMLElement, renderTo: HTMLElement);
  }

  export class Polisher {
    constructor();
    add(...css: string[]): Promise<void>;
  }

  export class Handler {
    constructor();
  }

  export const registeredHandlers: Handler[];
  export function registerHandlers(...handlers: Handler[]): void;
  export function initializeHandlers(handlers: Handler[]): void;
}
