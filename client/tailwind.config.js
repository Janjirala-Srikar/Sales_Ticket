/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Blue palette ── */
        blue: {
          surface: '#F0F7FF',
          muted: '#BFDBFE',
          mid: '#378ADD',
          primary: '#185FA5',
          deep: '#0C447C',
          ink: '#042C53',
        },
        /* ── Backgrounds ── */
        bg: {
          page: '#F8FAFC',
          surface: '#FFFFFF',
          subtle: '#F0F7FF',
          hover: '#BFDBFE',
        },
        /* ── Text ── */
        text: {
          primary: '#0F172A',
          body: '#475569',
          muted: '#94A3B8',
          link: '#185FA5',
        },
        /* ── Borders ── */
        border: {
          DEFAULT: '#CBD5E1',
          subtle: '#E2E8F0',
          focus: '#378ADD',
          strong: '#185FA5',
        },
        /* ── Buttons ── */
        btn: {
          primary: '#185FA5',
          'primary-hover': '#0C447C',
          secondary: '#F0F7FF',
          'secondary-hover': '#BFDBFE',
          ghost: '#185FA5',
        },
        /* ── Semantic states ── */
        success: {
          bg: '#ECFDF5',
          border: '#6EE7B7',
          text: '#065F46',
        },
        warning: {
          bg: '#FFFBEB',
          border: '#FCD34D',
          text: '#92400E',
        },
        error: {
          bg: '#FEF2F2',
          border: '#FCA5A5',
          text: '#991B1B',
        },
        info: {
          bg: '#F0F7FF',
          border: '#BFDBFE',
          text: '#0C447C',
        },
        /* ── Accent (cyan) ── */
        accent: {
          DEFAULT: '#22D3EE',
          deep: '#0891B2',
          surface: '#ECFEFF',
          text: '#164E63',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '999px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(15, 23, 42, 0.06)',
        md: '0 4px 12px rgba(15, 23, 42, 0.08)',
        lg: '0 8px 24px rgba(15, 23, 42, 0.10)',
      },
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
