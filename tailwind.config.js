/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        somane: {
          primary: 'rgb(var(--somane-primary-rgb) / <alpha-value>)',
          hover: 'rgb(var(--somane-primary-hover-rgb) / <alpha-value>)',
          accent: 'rgb(var(--somane-accent-rgb) / <alpha-value>)',
          success: 'rgb(var(--somane-success-rgb) / <alpha-value>)',
          warning: 'rgb(var(--somane-warning-rgb) / <alpha-value>)',
          danger: 'rgb(var(--somane-danger-rgb) / <alpha-value>)',
          info: 'rgb(var(--somane-info-rgb) / <alpha-value>)',
          background: 'rgb(var(--somane-bg-rgb) / <alpha-value>)',
          text: 'rgb(var(--somane-text-rgb) / <alpha-value>)',
          border: 'rgb(var(--somane-border-rgb) / <alpha-value>)',
        },
        gray: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => [
          shade,
          `rgb(var(--somane-neutral-${shade}-rgb) / <alpha-value>)`,
        ])),
        slate: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((shade) => [
          shade,
          `rgb(var(--somane-neutral-${shade}-rgb) / <alpha-value>)`,
        ])),
        purple: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => [
          shade,
          `rgb(var(--somane-brand-${shade}-rgb) / <alpha-value>)`,
        ])),
        violet: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => [
          shade,
          `rgb(var(--somane-brand-${shade}-rgb) / <alpha-value>)`,
        ])),
      },
      fontFamily: {
        sans: ['var(--somane-font-sans)'],
        mono: ['var(--somane-font-mono)'],
      },
      fontSize: {
        'somane-xs': 'var(--somane-text-xs)',
        'somane-sm': 'var(--somane-text-sm)',
        'somane-base': 'var(--somane-text-base)',
        'somane-md': 'var(--somane-text-md)',
        'somane-lg': 'var(--somane-text-lg)',
        'somane-xl': 'var(--somane-text-xl)',
        'somane-2xl': 'var(--somane-text-2xl)',
      },
      fontWeight: {
        somane: 'var(--somane-weight-regular)',
        'somane-medium': 'var(--somane-weight-medium)',
        'somane-semibold': 'var(--somane-weight-semibold)',
        'somane-bold': 'var(--somane-weight-bold)',
      },
      lineHeight: {
        'somane-tight': 'var(--somane-leading-tight)',
        somane: 'var(--somane-leading-normal)',
        'somane-relaxed': 'var(--somane-leading-relaxed)',
      },
      spacing: {
        'somane-1': 'var(--somane-space-1)',
        'somane-2': 'var(--somane-space-2)',
        'somane-3': 'var(--somane-space-3)',
        'somane-4': 'var(--somane-space-4)',
        'somane-5': 'var(--somane-space-5)',
        'somane-6': 'var(--somane-space-6)',
        'somane-8': 'var(--somane-space-8)',
        'somane-10': 'var(--somane-space-10)',
        'somane-12': 'var(--somane-space-12)',
      },
      borderRadius: {
        'somane-sm': 'var(--somane-radius-sm)',
        somane: 'var(--somane-radius)',
        'somane-lg': 'var(--somane-radius-lg)',
        'somane-xl': 'var(--somane-radius-xl)',
        'somane-pill': 'var(--somane-radius-pill)',
      },
      boxShadow: {
        'somane-xs': 'var(--somane-shadow-xs)',
        somane: 'var(--somane-shadow-sm)',
        'somane-md': 'var(--somane-shadow-md)',
        'somane-lg': 'var(--somane-shadow-lg)',
        'somane-focus': 'var(--somane-shadow-focus)',
      },
      transitionDuration: {
        'somane-fast': '150ms',
        somane: '200ms',
        'somane-slow': '300ms',
      },
      transitionTimingFunction: {
        somane: 'var(--somane-ease)',
      },
      width: {
        sidebar: 'var(--somane-sidebar-width)',
      },
      height: {
        header: 'var(--somane-header-height)',
      },
      zIndex: {
        somaneDropdown: 'var(--somane-z-dropdown)',
        somaneSticky: 'var(--somane-z-sticky)',
        somaneModal: 'var(--somane-z-modal)',
        somaneToast: 'var(--somane-z-toast)',
      },
    },
  },
  plugins: [],
}
