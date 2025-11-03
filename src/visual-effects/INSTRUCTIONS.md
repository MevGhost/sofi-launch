# Visual Effects Library - Complete Guide

## 📦 Overview
This directory contains a comprehensive collection of visual eye candy components extracted from the S4 Labs project. These components are designed to add stunning visual effects to your web applications with a focus on space, sci-fi, and futuristic themes.

## 🎨 Component Categories

### 1. **Particles** (`/particles`)
Advanced particle system components with WebGL and Three.js integration.

#### **ParticleMorph.tsx**
- **Description**: Interactive 3D particle system with morphing patterns
- **Dependencies**: `three`, `three-stdlib`, `framer-motion`
- **Features**:
  - Multiple pattern transitions (sphere, spiral, helix)
  - Mouse interaction with particle repulsion
  - Bloom post-processing effects
  - Auto-transition between patterns
- **Usage**:
```tsx
import ParticleMorph from '@/visual-effects/particles/ParticleMorph';

<div className="relative h-screen">
  <ParticleMorph />
</div>
```

#### **ParticleMorphV2.tsx**
- **Description**: Enhanced particle system with starfield background
- **Dependencies**: `three`
- **Features**:
  - 5 different patterns (sphere, spiral, helix, grid, torus)
  - Separate starfield layer with twinkling
  - Smooth transitions with easing
  - Three display modes: full, stars-only, particles-only
- **Usage**:
```tsx
import ParticleMorphV2 from '@/visual-effects/particles/ParticleMorphV2';

<ParticleMorphV2 mode="full" /> // Options: 'full' | 'stars-only' | 'particles-only'
```

#### **Confetti.tsx**
- **Description**: Celebration confetti with multiple shapes and colors
- **Dependencies**: `framer-motion`
- **Features**:
  - Multiple particle shapes (square, circle, triangle, star, diamond)
  - Gravity simulation
  - Mouse trail confetti variant
  - Customizable particle count and duration
- **Usage**:
```tsx
import { Confetti, MouseTrailConfetti } from '@/visual-effects/particles/Confetti';

// Triggered confetti
<Confetti isActive={showConfetti} duration={3000} particleCount={100} />

// Mouse trail effect
<MouseTrailConfetti isActive={true} />
```

#### **Sparkles.tsx**
- **Description**: Animated sparkle effects for UI elements
- **Dependencies**: `framer-motion`
- **Features**:
  - Multiple sparkle types (pop, cross, light, twinkle)
  - SparkleButton for interactive elements
  - SparkleText for animated text
  - Customizable frequency and size
- **Usage**:
```tsx
import { Sparkles, SparkleButton, SparkleText } from '@/visual-effects/particles/Sparkles';

// Sparkle container
<Sparkles color="#0EA5E9" size="md" frequency="medium">
  <div>Content with sparkles</div>
</Sparkles>

// Interactive button
<SparkleButton onClick={handleClick}>Launch Token</SparkleButton>

// Animated text
<SparkleText sparkleOnHover={true}>Hover me!</SparkleText>
```

### 2. **Backgrounds** (`/backgrounds`)
Immersive background components for creating atmospheric environments.

#### **SpaceBackground.tsx**
- **Description**: Animated starfield with moving stars and horizon glow
- **Dependencies**: None (vanilla canvas)
- **Features**:
  - 300+ animated stars
  - Earth silhouette with atmospheric glow
  - Horizon light effect
  - Responsive canvas rendering
- **Usage**:
```tsx
import { SpaceBackground } from '@/visual-effects/backgrounds/SpaceBackground';

<SpaceBackground />
```

#### **AnimatedBackground.tsx**
- **Description**: Layered animated orbs with grid pattern
- **Dependencies**: `framer-motion`
- **Features**:
  - Floating animated orbs
  - Grid overlay pattern
  - Twinkling stars
  - Gradient backgrounds
- **Usage**:
```tsx
import { AnimatedBackground } from '@/visual-effects/backgrounds/AnimatedBackground';

<AnimatedBackground />
```

#### **OuterSpaceBackground.tsx**
- **Description**: Multi-layer parallax space background
- **Dependencies**: Image assets (stars.png, twinkling.png, clouds.png)
- **Features**:
  - Three-layer parallax effect
  - Animated clouds/nebula
  - Twinkling star animation
  - CSS-based performance optimization
- **Usage**:
```tsx
import { OuterSpaceBackground } from '@/visual-effects/backgrounds/OuterSpaceBackground';

<OuterSpaceBackground />
```

#### **WaveBackground.tsx**
- **Description**: Animated wave effect at bottom of viewport
- **Dependencies**: CSS module
- **Features**:
  - SVG-based wave patterns
  - Multiple wave layers
  - Smooth animation with swell effect
  - Gradient fade to background
- **Usage**:
```tsx
import { WaveBackground } from '@/visual-effects/backgrounds/WaveBackground';

<WaveBackground />
```

### 3. **Animations** (`/animations`)
Standalone animation components for specific effects.

#### **ShootingStars.tsx**
- **Description**: Animated shooting star effects
- **Dependencies**: `framer-motion`
- **Features**:
  - Multiple shooting stars
  - Customizable count and timing
  - Gradient trails
  - CSS animations for performance
- **Usage**:
```tsx
import { ShootingStars } from '@/visual-effects/animations/ShootingStars';

<ShootingStars count={3} className="z-10" />
```

#### **LogoWithStars.tsx**
- **Description**: Logo component with animated shooting stars
- **Dependencies**: None
- **Features**:
  - Integrated shooting star animation
  - Responsive sizing (sm, md, lg)
  - Link wrapper support
  - Constrained animation area
- **Usage**:
```tsx
import { LogoWithStars } from '@/visual-effects/animations/LogoWithStars';

<LogoWithStars href="/" size="lg" />
```

### 4. **Buttons** (`/buttons`)
Interactive button components with visual effects.

#### **SparkleLaunchButton.tsx**
- **Description**: Premium button with sparkle effects and animations
- **Dependencies**: CSS module
- **Features**:
  - Animated sparkle particles
  - Glow effect on hover
  - Loading state with spinner
  - Rotating light effect
  - Floating particles animation
- **Usage**:
```tsx
import { SparkleLaunchButton } from '@/visual-effects/buttons/SparkleLaunchButton';

<SparkleLaunchButton 
  onClick={handleLaunch}
  loading={isLoading}
  disabled={isDisabled}
>
  Launch Token
</SparkleLaunchButton>
```

### 5. **Canvas** (`/canvas`)
Advanced canvas and WebGL components.

#### **PixelCanvas.tsx**
- **Description**: Interactive pixel grid animation
- **Dependencies**: CSS module
- **Features**:
  - Pixel-by-pixel animation
  - Distance-based delay effect
  - Hover-triggered animation
  - Customizable colors and gap
  - Link/button wrapper support
- **Usage**:
```tsx
import { PixelCanvas } from '@/visual-effects/canvas/PixelCanvas';

<PixelCanvas
  colors={['#0EA5E9', '#0052FF', '#06B6D4']}
  gap={5}
  speed={35}
  icon={<YourIcon />}
  title="Feature"
  href="https://example.com"
/>
```

#### **WebGLTwister.tsx**
- **Description**: WebGL shader-based twisting animation
- **Dependencies**: WebGL2 context
- **Features**:
  - GLSL fragment shader effects
  - Spiral twisting pattern
  - HSV color transitions
  - Customizable intensity
- **Usage**:
```tsx
import { WebGLTwister } from '@/visual-effects/canvas/WebGLTwister';

<div className="relative h-64">
  <WebGLTwister intensity={1.0} className="opacity-60" />
</div>
```

## 📁 Assets (`/assets`)
Required image assets for certain components:
- `stars.png` - Star texture for space backgrounds
- `twinkling.png` - Twinkling animation overlay
- `clouds.png` - Nebula/cloud texture
- `navbar.png` - Navigation texture
- `eth.png` - Ethereum logo

## 🛠 Installation & Setup

### Required Dependencies
```bash
# Core dependencies (already in your package.json)
npm install framer-motion

# For advanced particle effects
npm install three three-stdlib

# Types for TypeScript
npm install -D @types/three
```

### Import Styles
Some components require their CSS modules. Make sure to include them:
```tsx
// These are already included with the components
import styles from './ComponentName.module.css';
```

### Asset Configuration
For components using image assets, ensure the assets are accessible:
1. Copy assets from `/visual-effects/assets/` to your `public` folder
2. Update paths in components if needed (currently set to `/icons/`)

## 🎯 Usage Examples

### Creating a Hero Section with Effects
```tsx
import { ParticleMorphV2 } from '@/visual-effects/particles/ParticleMorphV2';
import { ShootingStars } from '@/visual-effects/animations/ShootingStars';
import { SparkleLaunchButton } from '@/visual-effects/buttons/SparkleLaunchButton';

function HeroSection() {
  return (
    <div className="relative min-h-screen">
      {/* Background effect */}
      <ParticleMorphV2 mode="full" />
      
      {/* Additional animation layer */}
      <ShootingStars count={3} />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-screen">
        <h1 className="text-6xl font-bold mb-8">Welcome to S4 Labs</h1>
        <SparkleLaunchButton onClick={() => console.log('Launch!')}>
          Get Started
        </SparkleLaunchButton>
      </div>
    </div>
  );
}
```

### Creating a Celebration Effect
```tsx
import { Confetti } from '@/visual-effects/particles/Confetti';
import { useState } from 'react';

function SuccessComponent() {
  const [celebrate, setCelebrate] = useState(false);
  
  const handleSuccess = () => {
    setCelebrate(true);
    setTimeout(() => setCelebrate(false), 3000);
  };
  
  return (
    <>
      <button onClick={handleSuccess}>Complete Action</button>
      <Confetti isActive={celebrate} duration={3000} particleCount={150} />
    </>
  );
}
```

### Creating an Interactive Feature Grid
```tsx
import { PixelCanvas } from '@/visual-effects/canvas/PixelCanvas';
import { FiZap, FiShield, FiTrendingUp } from 'react-icons/fi';

function FeatureGrid() {
  const features = [
    { icon: <FiZap />, title: 'Fast', href: '/features/speed' },
    { icon: <FiShield />, title: 'Secure', href: '/features/security' },
    { icon: <FiTrendingUp />, title: 'Scalable', href: '/features/scale' },
  ];
  
  return (
    <div className="grid grid-cols-3 gap-8">
      {features.map(feature => (
        <PixelCanvas
          key={feature.title}
          icon={feature.icon}
          title={feature.title}
          href={feature.href}
          colors={['#0EA5E9', '#0052FF']}
        />
      ))}
    </div>
  );
}
```

## 🎨 Customization Tips

### Color Schemes
Most components use the S4 Labs color palette:
- Primary Blue: `#0052FF`
- Electric Blue: `#0EA5E9`
- Light Cyan: `#06B6D4`
- Bright Blue: `#0077FF`

You can customize these by modifying the color arrays in each component.

### Performance Optimization
1. **Particle Systems**: Reduce particle count for better performance
2. **WebGL Components**: Use `powerPreference: 'high-performance'` for GPU optimization
3. **Animations**: Use CSS transforms instead of position changes
4. **Conditional Rendering**: Only render effects when visible

### Mobile Considerations
```tsx
// Disable heavy effects on mobile
const isMobile = window.innerWidth < 768;

{!isMobile && <ParticleMorphV2 />}
{isMobile && <SimpleBackground />}
```

## 🔧 Troubleshooting

### Common Issues and Solutions

1. **Three.js not rendering**
   - Ensure canvas container has explicit height
   - Check WebGL support in browser

2. **CSS Modules not loading**
   - Verify module.css files are in correct location
   - Check Next.js CSS module configuration

3. **Performance issues**
   - Reduce particle count
   - Disable effects on low-end devices
   - Use `will-change` CSS property sparingly

4. **Assets not loading**
   - Verify asset paths match your public folder structure
   - Check network tab for 404 errors

## 📝 Notes

- All components are written in TypeScript with full type safety
- Components use modern React patterns (hooks, functional components)
- Animations are optimized for 60fps performance
- Most effects are GPU-accelerated for smooth rendering
- Components are designed to be composable and reusable

## 🚀 Best Practices

1. **Layer effects** for depth (background → midground → foreground)
2. **Combine multiple effects** sparingly to avoid overwhelming users
3. **Provide fallbacks** for users with reduced motion preferences
4. **Test performance** on various devices and browsers
5. **Use loading states** for heavy components

## 📖 Component API Reference

Each component accepts specific props for customization. Refer to the TypeScript interfaces in each component file for complete prop definitions.

---

*These visual effects were extracted from the S4 Labs project and organized for reusability. Feel free to modify and extend them to suit your needs.*