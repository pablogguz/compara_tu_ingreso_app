import type { StylesConfig } from 'react-select'

// react-select uses CSS-in-JS internally, so colors must be duplicated here
// from the :root tokens in public/css/styles.css. Keep them in sync.
//
// The aesthetic mirrors the question card: aggressive glass surface, soft
// inner highlight, primary-tinted hover, accent bar on selected option.

const PRIMARY = '#3b82f6'
const PRIMARY_SOFT = '#58a2ec'
const PRIMARY_TINT = 'rgba(88, 162, 236, 0.10)'
const PRIMARY_TINT_HOVER = 'rgba(88, 162, 236, 0.16)'
const PRIMARY_RING = 'rgba(88, 162, 236, 0.22)'
const SURFACE = '#ffffff'
const SURFACE_GLASS = 'rgba(255, 255, 255, 0.92)'
const BORDER = '#e2e8f0'
const BORDER_HOVER = '#cbd5e1'
const INK = '#0a1628'
const INK_SOFT = '#475569'
const PLACEHOLDER = '#94a3b8'

const FONT_STACK =
  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"

const ease = 'cubic-bezier(0.4, 0, 0.2, 1)'

export const baseSelectStyles: StylesConfig<any, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: '56px',
    width: '100%',
    fontFamily: FONT_STACK,
    fontSize: '1rem',
    color: INK,
    backgroundColor: SURFACE,
    borderColor: state.isFocused || state.menuIsOpen ? PRIMARY_SOFT : BORDER,
    borderWidth: '1.5px',
    borderRadius: '14px',
    boxShadow:
      state.isFocused || state.menuIsOpen
        ? `0 0 0 4px ${PRIMARY_RING}, 0 1px 2px rgba(15, 23, 42, 0.04)`
        : '0 1px 2px rgba(15, 23, 42, 0.04)',
    transition: `border-color 200ms ${ease}, box-shadow 200ms ${ease}`,
    '&:hover': {
      borderColor: state.isFocused || state.menuIsOpen ? PRIMARY_SOFT : BORDER_HOVER,
    },
    cursor: 'pointer',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '2px 18px',
  }),
  placeholder: (base) => ({
    ...base,
    color: PLACEHOLDER,
    fontSize: '0.95rem',
    fontWeight: 400,
  }),
  input: (base) => ({
    ...base,
    fontFamily: FONT_STACK,
    fontSize: '0.95rem',
    color: INK,
    margin: 0,
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused || state.selectProps.menuIsOpen ? PRIMARY_SOFT : INK_SOFT,
    padding: '0 14px',
    transition: `transform 250ms ${ease}, color 200ms ${ease}`,
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    '&:hover': { color: PRIMARY_SOFT },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: INK_SOFT,
    padding: '0 6px',
    cursor: 'pointer',
    transition: `color 200ms ${ease}`,
    '&:hover': { color: INK },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    marginTop: 8,
    borderRadius: '16px',
    overflow: 'hidden',
    backgroundColor: SURFACE_GLASS,
    backdropFilter: 'blur(28px) saturate(180%)',
    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
    boxShadow:
      'inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 24px 48px -12px rgba(15, 23, 42, 0.28), 0 10px 24px -8px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.75)',
    animation: 'selectMenuFadeIn 220ms cubic-bezier(0.16, 1, 0.3, 1)',
  }),
  menuList: (base) => ({
    ...base,
    padding: '0 6px 6px',
    maxHeight: 280,
    '::-webkit-scrollbar': { width: 6 },
    '::-webkit-scrollbar-thumb': {
      background: 'rgba(15, 23, 42, 0.18)',
      borderRadius: 999,
    },
  }),
  option: (base, state) => ({
    ...base,
    fontFamily: FONT_STACK,
    fontSize: '0.92rem',
    fontWeight: state.isSelected ? 700 : 500,
    color: state.isSelected ? PRIMARY : INK,
    backgroundColor: state.isSelected
      ? PRIMARY_TINT
      : state.isFocused
        ? PRIMARY_TINT_HOVER
        : 'transparent',
    cursor: 'pointer',
    padding: '9px 12px 9px 18px',
    margin: '1px 0',
    borderRadius: '8px',
    minHeight: 38,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    transition: `background-color 120ms ${ease}, color 120ms ${ease}`,
    '&::before': state.isSelected
      ? {
          content: '""',
          position: 'absolute',
          left: 7,
          top: 9,
          bottom: 9,
          width: 3,
          borderRadius: 2,
          backgroundColor: PRIMARY,
        }
      : undefined,
    '&:active': {
      backgroundColor: PRIMARY_TINT_HOVER,
    },
  }),
  singleValue: (base) => ({
    ...base,
    fontFamily: FONT_STACK,
    fontSize: '1rem',
    fontWeight: 500,
    color: INK,
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: INK_SOFT,
    fontSize: '0.92rem',
    padding: '14px 16px',
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 12000,
  }),
  groupHeading: (base) => ({
    ...base,
    fontFamily: FONT_STACK,
    fontSize: '0.7rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: INK_SOFT,
    padding: '8px 14px 4px 14px',
    margin: 0,
  }),
}

export const compactSelectStyles: StylesConfig<any, false> = {
  ...baseSelectStyles,
  control: (base, state) => ({
    ...(baseSelectStyles.control as any)(base, state),
    minWidth: 140,
    width: 140,
  }),
  menu: (base) => ({
    ...(baseSelectStyles.menu as any)(base),
    minWidth: 140,
  }),
  menuList: (base) => ({ ...base, padding: 6, maxHeight: 220 }),
  option: (base, state) => ({
    ...(baseSelectStyles.option as any)(base, state),
    fontSize: '1rem',
    minHeight: 38,
    height: 38,
    justifyContent: 'center',
    paddingLeft: 14,
    '&::before': undefined,
  }),
  singleValue: (base) => ({
    ...base,
    fontFamily: FONT_STACK,
    fontSize: '1.1rem',
    fontWeight: 700,
    color: INK,
    letterSpacing: '-0.01em',
  }),
}
