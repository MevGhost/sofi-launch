# Visual Effects Library

A comprehensive collection of stunning visual effects components for React applications.

## Quick Start

```tsx
import { 
  ParticleMorphV2, 
  SparkleLaunchButton, 
  Confetti 
} from '@/visual-effects';

// Use in your components
<ParticleMorphV2 mode="full" />
<SparkleLaunchButton onClick={handleClick}>Launch</SparkleLaunchButton>
<Confetti isActive={celebrating} />
```

## Components

### 🎆 Particles
- `ParticleMorph` - 3D particle system with morphing patterns
- `ParticleMorphV2` - Enhanced version with starfield
- `Confetti` - Celebration effects
- `Sparkles` - Animated sparkle overlays

### 🌌 Backgrounds
- `SpaceBackground` - Animated starfield
- `AnimatedBackground` - Floating orbs
- `OuterSpaceBackground` - Parallax space
- `WaveBackground` - Animated waves

### ✨ Animations
- `ShootingStars` - Meteor shower effect
- `LogoWithStars` - Logo with shooting stars

### 🔘 Buttons
- `SparkleLaunchButton` - Premium animated button

### 🎨 Canvas
- `PixelCanvas` - Interactive pixel grid
- `WebGLTwister` - Shader-based effects

## Installation

```bash
# Install required dependencies
npm install framer-motion three three-stdlib
npm install -D @types/three
```

## Demo

Run the demo to see all components in action:

```tsx
import VisualEffectsDemo from '@/visual-effects/DEMO';

// Add to your page
<VisualEffectsDemo />
```

## Documentation

See [INSTRUCTIONS.md](./INSTRUCTIONS.md) for detailed documentation and usage examples.

## Assets

Copy image assets from `/assets/` to your `public/icons/` directory:
- stars.png
- twinkling.png
- clouds.png

## License

MIT