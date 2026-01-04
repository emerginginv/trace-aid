import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          '50': 'hsl(var(--primary-50))',
          '100': 'hsl(var(--primary-100))',
          '200': 'hsl(var(--primary-200))',
          '300': 'hsl(var(--primary-300))',
          '400': 'hsl(var(--primary-400))',
          '500': 'hsl(var(--primary-500))',
          '600': 'hsl(var(--primary-600))',
          '700': 'hsl(var(--primary-700))',
          '800': 'hsl(var(--primary-800))',
          '900': 'hsl(var(--primary-900))',
          '950': 'hsl(var(--primary-950))',
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          '50': 'hsl(var(--secondary-50))',
          '100': 'hsl(var(--secondary-100))',
          '200': 'hsl(var(--secondary-200))',
          '300': 'hsl(var(--secondary-300))',
          '400': 'hsl(var(--secondary-400))',
          '500': 'hsl(var(--secondary-500))',
          '600': 'hsl(var(--secondary-600))',
          '700': 'hsl(var(--secondary-700))',
          '800': 'hsl(var(--secondary-800))',
          '900': 'hsl(var(--secondary-900))',
          '950': 'hsl(var(--secondary-950))',
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        neutral: {
          '50': 'hsl(var(--neutral-50))',
          '100': 'hsl(var(--neutral-100))',
          '200': 'hsl(var(--neutral-200))',
          '300': 'hsl(var(--neutral-300))',
          '400': 'hsl(var(--neutral-400))',
          '500': 'hsl(var(--neutral-500))',
          '600': 'hsl(var(--neutral-600))',
          '700': 'hsl(var(--neutral-700))',
          '800': 'hsl(var(--neutral-800))',
          '900': 'hsl(var(--neutral-900))',
          '950': 'hsl(var(--neutral-950))'
        },
        destructive: {
          '50': 'hsl(var(--destructive-50))',
          '100': 'hsl(var(--destructive-100))',
          '200': 'hsl(var(--destructive-200))',
          '300': 'hsl(var(--destructive-300))',
          '400': 'hsl(var(--destructive-400))',
          '500': 'hsl(var(--destructive-500))',
          '600': 'hsl(var(--destructive-600))',
          '700': 'hsl(var(--destructive-700))',
          '800': 'hsl(var(--destructive-800))',
          '900': 'hsl(var(--destructive-900))',
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        success: {
          '50': 'hsl(var(--success-50))',
          '100': 'hsl(var(--success-100))',
          '200': 'hsl(var(--success-200))',
          '300': 'hsl(var(--success-300))',
          '400': 'hsl(var(--success-400))',
          '500': 'hsl(var(--success-500))',
          '600': 'hsl(var(--success-600))',
          '700': 'hsl(var(--success-700))',
          '800': 'hsl(var(--success-800))',
          '900': 'hsl(var(--success-900))',
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        warning: {
          '50': 'hsl(var(--warning-50))',
          '100': 'hsl(var(--warning-100))',
          '200': 'hsl(var(--warning-200))',
          '300': 'hsl(var(--warning-300))',
          '400': 'hsl(var(--warning-400))',
          '500': 'hsl(var(--warning-500))',
          '600': 'hsl(var(--warning-600))',
          '700': 'hsl(var(--warning-700))',
          '800': 'hsl(var(--warning-800))',
          '900': 'hsl(var(--warning-900))',
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))'
        },
        info: {
          '50': 'hsl(var(--info-50))',
          '100': 'hsl(var(--info-100))',
          '200': 'hsl(var(--info-200))',
          '300': 'hsl(var(--info-300))',
          '400': 'hsl(var(--info-400))',
          '500': 'hsl(var(--info-500))',
          '600': 'hsl(var(--info-600))',
          '700': 'hsl(var(--info-700))',
          '800': 'hsl(var(--info-800))',
          '900': 'hsl(var(--info-900))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      fontSize: {
        '2xs': ['var(--font-size-2xs)', { lineHeight: 'var(--line-height-ui)' }],
        'xs': ['var(--font-size-xs)', { lineHeight: 'var(--line-height-ui)' }],
        'sm': ['var(--font-size-sm)', { lineHeight: 'var(--line-height-normal)' }],
        'base': ['var(--font-size-base)', { lineHeight: 'var(--line-height-normal)' }],
        'lg': ['var(--font-size-lg)', { lineHeight: 'var(--line-height-ui)' }],
        'xl': ['var(--font-size-xl)', { lineHeight: 'var(--line-height-snug)' }],
        '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--line-height-snug)' }],
        '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--line-height-tight)' }],
        '4xl': ['var(--font-size-4xl)', { lineHeight: 'var(--line-height-tight)' }]
      },
      fontWeight: {
        light: 'var(--font-weight-light)',
        normal: 'var(--font-weight-regular)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)'
      },
      lineHeight: {
        'tight': 'var(--line-height-tight)',
        'snug': 'var(--line-height-snug)',
        'ui': 'var(--line-height-ui)',
        'normal': 'var(--line-height-normal)',
        'relaxed': 'var(--line-height-relaxed)'
      },
      letterSpacing: {
        'tighter': 'var(--letter-spacing-tighter)',
        'tight': 'var(--letter-spacing-tight)',
        'normal': 'var(--letter-spacing-normal)',
        'wide': 'var(--letter-spacing-wide)',
        'wider': 'var(--letter-spacing-wider)',
        'widest': 'var(--letter-spacing-widest)'
      },
      spacing: {
        'px': 'var(--space-px)',
        '0': 'var(--space-0)',
        '0.5': 'var(--space-0-5)',
        '1': 'var(--space-1)',
        '1.5': 'var(--space-1-5)',
        '2': 'var(--space-2)',
        '2.5': 'var(--space-2-5)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
        '7': 'var(--space-7)',
        '8': 'var(--space-8)',
        '9': 'var(--space-9)',
        '10': 'var(--space-10)',
        '12': 'var(--space-12)',
        '14': 'var(--space-14)',
        '16': 'var(--space-16)',
        '20': 'var(--space-20)',
        '24': 'var(--space-24)'
      },
      boxShadow: {
        '2xs': 'var(--shadow-2xs)',
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'inner': 'var(--shadow-inner)',
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'primary': 'var(--shadow-primary)',
        'success': 'var(--shadow-success)',
        'warning': 'var(--shadow-warning)',
        'destructive': 'var(--shadow-destructive)'
      },
      borderRadius: {
        'none': 'var(--radius-none)',
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        DEFAULT: 'var(--radius-DEFAULT)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        'full': 'var(--radius-full)'
      },
      transitionDuration: {
        'fast': '100ms',
        DEFAULT: '150ms',
        'slow': '250ms',
        'slower': '350ms'
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' }
        },
        'slide-in-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-in-down': {
          from: { transform: 'translateY(-8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
        'fade-out': 'fade-out 0.15s ease-out',
        'slide-in-up': 'slide-in-up 0.2s ease-out',
        'slide-in-down': 'slide-in-down 0.2s ease-out',
        'scale-in': 'scale-in 0.15s ease-out'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        serif: ['Lora', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
        mono: ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace']
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;