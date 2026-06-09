export const Colors = {
  cream: '#F5F0E8',
  charcoal: '#1C1C1E',
  mink: '#8B7355',
  minkLight: '#B09070',
  blush: '#E8C4B8',
  sage: '#7C9A7E',
  stone: '#D3CFC8',
  stoneLight: '#EAE6E0',
  white: '#FFFFFF',
  black: '#000000',
  error: '#D85A30',
  success: '#1D9E75',

  // Gradients
  gradientWarm: ['#F5F0E8', '#EDE5D8'],
  gradientMink: ['#8B7355', '#6B5840'],
  gradientDark: ['#1C1C1E', '#2C2C2E'],
}

export const Typography = {
  display: { fontFamily: 'serif', fontWeight: '700' },
  heading: { fontFamily: 'serif', fontWeight: '600' },
  body: { fontFamily: 'System', fontWeight: '400' },
  label: { fontFamily: 'System', fontWeight: '500', letterSpacing: 2 },
  mono: { fontFamily: 'Courier', fontWeight: '400' },
}

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
}

export const Radius = {
  sm: 6, md: 12, lg: 20, xl: 32, full: 999,
}

export const Shadow = {
  soft: {
    shadowColor: '#1C1C1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  medium: {
    shadowColor: '#1C1C1E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
}

export const OCCASIONS = [
  { id: 'wedding',  label: 'Wedding',  icon: '💍', color: '#E8C4B8' },
  { id: 'office',   label: 'Office',   icon: '💼', color: '#B8D4E8' },
  { id: 'casual',   label: 'Casual',   icon: '☀️',  color: '#E8E4B8' },
  { id: 'party',    label: 'Party',    icon: '🎉', color: '#D4B8E8' },
  { id: 'date',     label: 'Date',     icon: '🌹', color: '#E8B8C4' },
  { id: 'festival', label: 'Festival', icon: '🎊', color: '#B8E8C4' },
  { id: 'formal',   label: 'Formal',   icon: '🎩', color: '#C4C4C4' },
  { id: 'gym',      label: 'Gym',      icon: '🏋️', color: '#B8E8D4' },
  { id: 'beach',    label: 'Beach',    icon: '🏖️', color: '#B8D8E8' },
]

export const CATEGORY_COLORS = {
  top:       '#B8D4E8',
  bottom:    '#B8E8C4',
  shoes:     '#E8D4B8',
  dress:     '#E8B8D4',
  outerwear: '#D4B8E8',
  accessory: '#E8E8B8',
  unknown:   '#D3CFC8',
}
