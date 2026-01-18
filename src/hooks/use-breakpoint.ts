import { useState, useEffect } from 'react';

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpoints: Record<Breakpoint, number> = {
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1400,
};

/**
 * Returns the current breakpoint based on window width.
 * Useful for conditional rendering beyond what CSS can handle.
 * 
 * @example
 * const breakpoint = useBreakpoint();
 * const isMobileOrTablet = ['xs', 'sm', 'md'].includes(breakpoint);
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');

  useEffect(() => {
    const getBreakpoint = (width: number): Breakpoint => {
      if (width < breakpoints.xs) return 'xs';
      if (width < breakpoints.sm) return 'xs';
      if (width < breakpoints.md) return 'sm';
      if (width < breakpoints.lg) return 'md';
      if (width < breakpoints.xl) return 'lg';
      if (width < breakpoints['2xl']) return 'xl';
      return '2xl';
    };

    const handleResize = () => {
      setBreakpoint(getBreakpoint(window.innerWidth));
    };

    // Set initial value
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}

/**
 * Returns true if the current breakpoint is at or below the specified breakpoint.
 * 
 * @example
 * const isSmallScreen = useBreakpointDown('md'); // true for xs, sm, md
 */
export function useBreakpointDown(target: Breakpoint): boolean {
  const breakpoint = useBreakpoint();
  const order: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  return order.indexOf(breakpoint) <= order.indexOf(target);
}

/**
 * Returns true if the current breakpoint is at or above the specified breakpoint.
 * 
 * @example
 * const isLargeScreen = useBreakpointUp('lg'); // true for lg, xl, 2xl
 */
export function useBreakpointUp(target: Breakpoint): boolean {
  const breakpoint = useBreakpoint();
  const order: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  return order.indexOf(breakpoint) >= order.indexOf(target);
}
