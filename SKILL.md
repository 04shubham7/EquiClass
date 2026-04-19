# Frontend Enhancement Skill (SKILL.md)

## Overview
This document defines the skill set for enhancing the EquiClass (ClassSwap) frontend with professional-grade UI/UX improvements while maintaining the existing architecture.

## Current State
- React 19 + Vite 7 + Tailwind CSS 4
- Dark/light theme system with smooth transitions
- GSAP animations partially integrated
- Basic PWA support via vite-plugin-pwa
- Component structure: Auth, Dashboard, Onboarding, Routine, Modals

## Enhancement Goals

### 1. Page Transitions & Animation System
- **Goal**: Smooth transitions between app states (auth → onboarding → dashboard)
- **Tool**: GSAP + @gsap/react
- **Patterns**:
  - Fade + slide transitions for route changes
  - Staggered content reveal on mount
  - Exit animations before component unmount

### 2. Micro-interactions
- **Goal**: Delightful feedback for user actions
- **Elements**:
  - Button press effects (scale + shadow)
  - Card hover lift with subtle shadow
  - Input focus animations (border glow)
  - Toast notifications for actions
  - Skeleton loading states

### 3. Accessibility (a11y)
- **Goal**: WCAG 2.1 AA compliance
- **Requirements**:
  - Keyboard navigation for all interactive elements
  - Focus trap in modals
  - ARIA labels and live regions
  - Reduced motion support (`prefers-reduced-motion`)
  - High contrast mode support
  - Skip links for keyboard users

### 4. PWA Optimization
- **Goal**: Native app-like experience
- **Enhancements**:
  - Offline fallback page
  - Network status indicator
  - Update prompts for new versions
  - App-like splash screen
  - Touch gesture support (swipe actions)

### 5. Performance
- **Goal**: 60fps animations, fast interactions
- **Strategies**:
  - CSS containment for animation isolation
  - `will-change` hints for animated elements
  - Lazy load heavy components
  - Debounced scroll/resize handlers

## Implementation Phases

### Phase 1: Animation Infrastructure
- Create `usePageTransition` hook
- Create `AnimatedRoutes` wrapper
- Set up GSAP context in App

### Phase 2: Component Polish
- Add skeleton loaders for async data
- Enhance button states (loading, disabled, success)
- Add card entrance animations

### Phase 3: Accessibility
- Audit focus management
- Add ARIA attributes
- Implement keyboard shortcuts
- Test with screen readers

### Phase 4: PWA Features
- Custom offline page
- Update notification component
- Network status banner

## File Structure
```
client/src/
├── components/
│   ├── ui/           # Reusable animation primitives
│   │   ├── FadeIn.jsx
│   │   ├── SlideUp.jsx
│   │   ├── Skeleton.jsx
│   │   └── Toast.jsx
│   ├── transitions/  # Page-level transitions
│   │   └── PageTransition.jsx
│   └── ...
├── hooks/
│   ├── usePageTransition.js
│   ├── useKeyboardNavigation.js
│   └── useNetworkStatus.js
├── utils/
│   └── animation.js  # GSAP defaults & presets
└── ...
```

## Animation Principles
1. **Duration**: 200-400ms for micro-interactions, 500-800ms for page transitions
2. **Easing**: Use `cubic-bezier(0.22, 1, 0.36, 1)` for smooth, natural motion
3. **Stagger**: 50-100ms between list items
4. **Performance**: Only animate `transform` and `opacity`

## Testing Checklist
- [ ] Animations respect `prefers-reduced-motion`
- [ ] All interactive elements keyboard accessible
- [ ] Focus visible states are clear
- [ ] No layout shift during animations
- [ ] 60fps on mobile devices
- [ ] Works offline after PWA install
