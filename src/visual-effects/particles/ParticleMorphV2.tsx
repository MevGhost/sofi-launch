'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ParticleMorphV2Props {
  mode?: 'full' | 'stars-only' | 'particles-only';
}

const ParticleMorphV2: React.FC<ParticleMorphV2Props> = ({ mode = 'full' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const timeRef = useRef(0);
  const screenMouseRef = useRef(new THREE.Vector2(10000, 10000));
  const worldMouseRef = useRef(new THREE.Vector3());
  const frameRef = useRef<number>();
  const currentPatternRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const transitionProgressRef = useRef(0);
  const transitionDataRef = useRef<any>({});
  const clockRef = useRef(new THREE.Clock());

  // S4Labs blue color palettes - no orange
  const colorPalettes = [
    [
      new THREE.Color(0x0077ff), // Primary Blue
      new THREE.Color(0x00aaff), // Light Blue
      new THREE.Color(0x44ccff), // Cyan
      new THREE.Color(0x0055cc)  // Dark Blue
    ],
    [
      new THREE.Color(0x0052FF), // Deep Blue
      new THREE.Color(0x0EA5E9), // Electric Blue
      new THREE.Color(0x06B6D4), // Light Cyan
      new THREE.Color(0x0077FF)  // Bright Blue
    ],
    [
      new THREE.Color(0x00ccff), // Bright Cyan
      new THREE.Color(0x0099ff), // Sky Blue
      new THREE.Color(0x0066cc), // Royal Blue
      new THREE.Color(0x003388)  // Navy Blue
    ],
    [
      new THREE.Color(0x00aaff), // Vivid Blue
      new THREE.Color(0x00ddff), // Aqua
      new THREE.Color(0x0088cc), // Ocean Blue
      new THREE.Color(0x004499)  // Deep Ocean
    ],
    [
      new THREE.Color(0x0EA5E9), // S4Labs Blue
      new THREE.Color(0x06B6D4), // S4Labs Cyan
      new THREE.Color(0x0052FF), // S4Labs Deep
      new THREE.Color(0x00AAFF)  // S4Labs Light
    ]
  ];

  // Pattern creation functions
  const createSphere = (i: number, count: number) => {
    const t = i / count;
    const phi = Math.acos(2 * t - 1);
    const theta = 2 * Math.PI * (i / count) * Math.sqrt(count);
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * 30,
      Math.sin(phi) * Math.sin(theta) * 30,
      Math.cos(phi) * 30
    );
  };

  const createSpiral = (i: number, count: number) => {
    const t = i / count;
    const numArms = 3;
    const armIndex = i % numArms;
    const angleOffset = (2 * Math.PI / numArms) * armIndex;
    const angle = Math.pow(t, 0.7) * 15 + angleOffset;
    const radius = t * 40;
    const height = Math.sin(t * Math.PI * 2) * 5;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      height
    );
  };

  const createHelix = (i: number, count: number) => {
    const numHelices = 2;
    const helixIndex = i % numHelices;
    const t = Math.floor(i / numHelices) / Math.floor(count / numHelices);
    const angle = t * Math.PI * 10;
    const radius = 15;
    const height = (t - 0.5) * 60;
    const angleOffset = helixIndex * Math.PI;
    return new THREE.Vector3(
      Math.cos(angle + angleOffset) * radius,
      Math.sin(angle + angleOffset) * radius,
      height
    );
  };

  const createGrid = (i: number, count: number) => {
    const sideLength = Math.ceil(Math.cbrt(count));
    const spacing = 60 / sideLength;
    const halfGrid = (sideLength - 1) * spacing / 2;
    const iz = Math.floor(i / (sideLength * sideLength));
    const iy = Math.floor((i % (sideLength * sideLength)) / sideLength);
    const ix = i % sideLength;
    return new THREE.Vector3(
      ix * spacing - halfGrid,
      iy * spacing - halfGrid,
      iz * spacing - halfGrid
    );
  };

  const createTorus = (i: number, count: number) => {
    const R = 30;
    const r = 10;
    const angle1 = Math.random() * Math.PI * 2;
    const angle2 = Math.random() * Math.PI * 2;
    return new THREE.Vector3(
      (R + r * Math.cos(angle2)) * Math.cos(angle1),
      (R + r * Math.cos(angle2)) * Math.sin(angle1),
      r * Math.sin(angle2)
    );
  };

  const patterns = [createSphere, createSpiral, createHelix, createGrid, createTorus];
  const patternNames = ['Cosmic Sphere', 'Spiral Nebula', 'Quantum Helix', 'Stardust Grid', 'Celestial Torus'];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const particleCount = 15000;
    const starCount = 3000;
    const transitionSpeed = 0.02;

    // Initialize Three.js
    const scene = new THREE.Scene();
    scene.background = null; // Ensure scene has no background
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      65,
      container.offsetWidth / container.offsetHeight,
      0.1,
      1500
    );
    camera.position.z = 100;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // Fully transparent background
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Create starfield
    const createStarfield = () => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);
      const starInfo = new Float32Array(starCount);
      const color = new THREE.Color();
      const starRadius = 500;
      
      for (let i = 0; i < starCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        
        positions[i * 3] = starRadius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = starRadius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = starRadius * Math.cos(phi);
        
        // Blue-tinted stars
        color.setHSL(0.55 + Math.random() * 0.1, 0.3, Math.random() * 0.3 + 0.7);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        starInfo[i] = Math.random();
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('starInfo', new THREE.BufferAttribute(starInfo, 1));
      
      const material = new THREE.ShaderMaterial({
        uniforms: { 
          time: { value: 0 },
          pointSize: { value: 1.5 }
        },
        vertexShader: `
          attribute float starInfo;
          varying vec3 vColor;
          varying float vStarInfo;
          uniform float pointSize;
          void main() {
            vColor = color;
            vStarInfo = starInfo;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = pointSize * (150.0 / -mvPosition.z);
          }
        `,
        fragmentShader: `
          uniform float time;
          varying vec3 vColor;
          varying float vStarInfo;
          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float dist = length(uv);
            if (dist > 0.5) discard;
            float twinkle = sin(time * (vStarInfo * 2.0 + 0.5) + vStarInfo * 3.14 * 2.0) * 0.2 + 0.8;
            float alpha = pow(1.0 - dist * 2.0, 1.5);
            gl_FragColor = vec4(vColor, alpha * twinkle * 0.8);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
      });
      
      const starPoints = new THREE.Points(geometry, material);
      starPoints.renderOrder = -1;
      return starPoints;
    };
    
    // Add stars if not particles-only mode
    if (mode !== 'particles-only') {
      const stars = createStarfield();
      starsRef.current = stars;
      scene.add(stars);
    }
    
    // Create particle system if not stars-only mode
    const createParticleSystem = () => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      const indices = new Float32Array(particleCount);
      const particleTypes = new Float32Array(particleCount);

      const initialPattern = patterns[0];
      const initialPalette = colorPalettes[0];

      for (let i = 0; i < particleCount; i++) {
        indices[i] = i;
        particleTypes[i] = Math.floor(Math.random() * 3);
        
        const pos = initialPattern(i, particleCount);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;

        const colorIndex = Math.floor(Math.random() * initialPalette.length);
        const baseColor = initialPalette[colorIndex];
        const variation = 0.85 + Math.random() * 0.3;
        const finalColor = baseColor.clone().multiplyScalar(variation);
        colors[i * 3] = finalColor.r;
        colors[i * 3 + 1] = finalColor.g;
        colors[i * 3 + 2] = finalColor.b;
        
        sizes[i] = 1.0 + Math.random() * 1.5;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('index', new THREE.BufferAttribute(indices, 1));
      geometry.setAttribute('particleType', new THREE.BufferAttribute(particleTypes, 1));
      geometry.userData.currentColors = new Float32Array(colors);

      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          mousePos: { value: new THREE.Vector3(10000, 10000, 0) },
        },
        vertexShader: `
          uniform float time;
          uniform vec3 mousePos;
          attribute float size;
          attribute float index;
          attribute float particleType;
          varying vec3 vColor;
          varying float vDistanceToMouse;
          varying float vType;
          varying float vIndex;
          
          float rand(vec2 co){ 
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); 
          }
          
          void main() {
            vColor = color;
            vType = particleType;
            vIndex = index;
            vec3 pos = position;
            
            float T = time * 0.5;
            float idx = index * 0.01;
            
            float noiseFactor1 = sin(idx * 30.0 + T * 15.0) * 0.4 + 0.6;
            vec3 offset1 = vec3(
              cos(T * 1.2 + idx * 5.0) * noiseFactor1,
              sin(T * 0.9 + idx * 6.0) * noiseFactor1,
              cos(T * 1.1 + idx * 7.0) * noiseFactor1
            ) * 0.4;
            
            float noiseFactor2 = rand(vec2(idx, idx * 0.5)) * 0.5 + 0.5;
            float speedFactor = 0.3;
            vec3 offset2 = vec3(
              sin(T * speedFactor * 1.3 + idx * 1.1) * noiseFactor2,
              cos(T * speedFactor * 1.7 + idx * 1.2) * noiseFactor2,
              sin(T * speedFactor * 1.1 + idx * 1.3) * noiseFactor2
            ) * 0.8;
            
            pos += offset1 + offset2;
            
            vec3 toMouse = mousePos - pos;
            float dist = length(toMouse);
            vDistanceToMouse = 0.0;
            float interactionRadius = 30.0;
            float falloffStart = 5.0;
            
            if (dist < interactionRadius) {
              float influence = smoothstep(interactionRadius, falloffStart, dist);
              vec3 repelDir = normalize(pos - mousePos);
              pos += repelDir * influence * 15.0;
              vDistanceToMouse = influence;
            }
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            float perspectiveFactor = 700.0 / -mvPosition.z;
            gl_PointSize = size * perspectiveFactor * (1.0 + vDistanceToMouse * 0.5);
          }
        `,
        fragmentShader: `
          uniform float time;
          varying vec3 vColor;
          varying float vDistanceToMouse;
          varying float vType;
          varying float vIndex;
          
          vec3 rgb2hsl(vec3 c) {
            vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
            vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
            vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
            float d = q.x - min(q.w, q.y);
            float e = 1.0e-10;
            return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
          }
          
          vec3 hsl2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
          }
          
          void main() {
            vec2 uv = gl_PointCoord * 2.0 - 1.0;
            float dist = length(uv);
            
            // Enhanced glow effect
            vec3 baseColor = vColor;
            vec3 hsl = rgb2hsl(baseColor);
            float hueShift = sin(time * 0.05 + vIndex * 0.001) * 0.02;
            hsl.x = fract(hsl.x + hueShift);
            baseColor = hsl2rgb(hsl);
            
            // Multi-layer glow for bloom-like effect
            float glow1 = exp(-dist * dist * 4.0); // Tight core
            float glow2 = exp(-dist * dist * 1.5); // Medium glow
            float glow3 = exp(-dist * dist * 0.5); // Wide bloom
            
            vec3 finalColor = baseColor;
            float alpha = 0.0;
            
            if (vType < 0.5) {
              // Glowing orb with bloom
              alpha = glow1 * 1.0 + glow2 * 0.5 + glow3 * 0.2;
              finalColor = mix(baseColor, baseColor * 1.5, glow1);
            } else if (vType < 1.5) {
              // Ring with halo
              float ringWidth = 0.1;
              float ringCenter = 0.65;
              float ringShape = exp(-pow(dist - ringCenter, 2.0) / (2.0 * ringWidth * ringWidth));
              alpha = smoothstep(0.1, 0.5, ringShape) * 0.8;
              alpha += glow2 * 0.2; // Add halo
              finalColor = mix(baseColor, baseColor * 1.3, ringShape);
            } else {
              // Pulsing star with rays
              float pulse = sin(dist * 5.0 - time * 2.0 + vIndex * 0.1) * 0.1 + 0.9;
              alpha = (glow1 * 0.8 + glow2 * 0.4) * pulse;
              finalColor = mix(baseColor, baseColor * 1.4, pulse);
            }
            
            // Mouse interaction boost
            finalColor = mix(finalColor, finalColor * 1.5 + vec3(0.1, 0.2, 0.3), vDistanceToMouse * 0.8);
            alpha = mix(alpha, min(alpha * 1.5, 1.0), vDistanceToMouse);
            
            // Output with premultiplied alpha for better blending
            alpha = clamp(alpha * 0.85, 0.0, 1.0);
            gl_FragColor = vec4(finalColor * alpha, alpha);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
      });

      return new THREE.Points(geometry, material);
    };

    // Add particles if not stars-only mode
    let particles: THREE.Points | null = null;
    if (mode !== 'stars-only') {
      particles = createParticleSystem();
      particlesRef.current = particles;
      scene.add(particles);
    }

    // Glow effects are built into the particle shader for transparency

    // Mouse interaction
    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      screenMouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      screenMouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    // Pattern transition
    const transitionToPattern = (newPattern: number) => {
      if (!particles) return;
      
      isTransitioningRef.current = true;
      const posAttr = particles.geometry.attributes.position;
      const colAttr = particles.geometry.attributes.color;
      const curPos = new Float32Array(posAttr.array);
      const curCol = particles.geometry.userData.currentColors 
        ? new Float32Array(particles.geometry.userData.currentColors) 
        : new Float32Array(colAttr.array);
      const newPos = new Float32Array(curPos.length);
      const patternFn = patterns[newPattern];
      
      for (let i = 0; i < particleCount; i++) {
        const p = patternFn(i, particleCount);
        newPos[i * 3] = p.x;
        newPos[i * 3 + 1] = p.y;
        newPos[i * 3 + 2] = p.z;
      }
      
      const newCol = new Float32Array(curCol.length);
      const palette = colorPalettes[newPattern];
      
      for (let i = 0; i < particleCount; i++) {
        const idx = Math.floor(Math.random() * palette.length);
        const base = palette[idx];
        const variation = 0.85 + Math.random() * 0.3;
        const final = base.clone().multiplyScalar(variation);
        newCol[i * 3] = final.r;
        newCol[i * 3 + 1] = final.g;
        newCol[i * 3 + 2] = final.b;
      }
      
      transitionDataRef.current = {
        fromPositions: curPos,
        toPositions: newPos,
        fromColors: curCol,
        toColors: newCol,
        targetPattern: newPattern
      };
      
      transitionProgressRef.current = 0;
    };

    // Handle click
    const handleClick = () => {
      if (isTransitioningRef.current) return;
      const nextPattern = (currentPatternRef.current + 1) % patterns.length;
      currentPatternRef.current = nextPattern;
      transitionToPattern(nextPattern);
    };

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      const rect = container.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      renderer.setSize(rect.width, rect.height);
    };

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      const deltaTime = clockRef.current.getDelta();
      timeRef.current += deltaTime;
      
      // Update star shader time
      if (starsRef.current && starsRef.current.material) {
        const starMaterial = starsRef.current.material as THREE.ShaderMaterial;
        if (starMaterial.uniforms && starMaterial.uniforms.time) {
          starMaterial.uniforms.time.value = timeRef.current;
        }
      }
      
      // Update mouse position
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(screenMouseRef.current, camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersectPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
        if (screenMouseRef.current.x < 9000) {
          worldMouseRef.current.lerp(intersectPoint, 0.1);
        }
      }
      
      // Update particle shader uniforms
      if (particles && particles.material) {
        const particleMaterial = particles.material as THREE.ShaderMaterial;
        if (particleMaterial.uniforms) {
          if (particleMaterial.uniforms.time) {
            particleMaterial.uniforms.time.value = timeRef.current;
          }
          if (particleMaterial.uniforms.mousePos) {
            particleMaterial.uniforms.mousePos.value.copy(worldMouseRef.current);
          }
        }
      }
      
      // Handle transitions
      if (isTransitioningRef.current && transitionDataRef.current.fromPositions && particles) {
        transitionProgressRef.current += transitionSpeed;
        
        if (transitionProgressRef.current >= 1.0) {
          // Complete transition
          const positions = particles.geometry.attributes.position.array as Float32Array;
          const colors = particles.geometry.attributes.color.array as Float32Array;
          positions.set(transitionDataRef.current.toPositions);
          colors.set(transitionDataRef.current.toColors);
          particles.geometry.userData.currentColors = new Float32Array(transitionDataRef.current.toColors);
          particles.geometry.attributes.position.needsUpdate = true;
          particles.geometry.attributes.color.needsUpdate = true;
          
          isTransitioningRef.current = false;
          transitionProgressRef.current = 0;
          transitionDataRef.current = {};
        } else {
          // Interpolate transition
          const positions = particles.geometry.attributes.position.array as Float32Array;
          const colors = particles.geometry.attributes.color.array as Float32Array;
          const fromPos = transitionDataRef.current.fromPositions;
          const toPos = transitionDataRef.current.toPositions;
          const fromCol = transitionDataRef.current.fromColors;
          const toCol = transitionDataRef.current.toColors;
          const t = transitionProgressRef.current;
          const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          
          for (let i = 0; i < positions.length / 3; i++) {
            const index = i * 3;
            positions[index] = fromPos[index] * (1 - ease) + toPos[index] * ease;
            positions[index + 1] = fromPos[index + 1] * (1 - ease) + toPos[index + 1] * ease;
            positions[index + 2] = fromPos[index + 2] * (1 - ease) + toPos[index + 2] * ease;
            colors[index] = fromCol[index] * (1 - ease) + toCol[index] * ease;
            colors[index + 1] = fromCol[index + 1] * (1 - ease) + toCol[index + 1] * ease;
            colors[index + 2] = fromCol[index + 2] * (1 - ease) + toCol[index + 2] * ease;
          }
          
          particles.geometry.attributes.position.needsUpdate = true;
          particles.geometry.attributes.color.needsUpdate = true;
          particles.geometry.userData.currentColors = new Float32Array(colors);
        }
      }
      
      // Camera animation
      const baseRadius = 100;
      const radiusVariation = Math.sin(timeRef.current * 0.1) * 15;
      const cameraRadius = baseRadius + radiusVariation;
      const angleX = timeRef.current * 0.08;
      const angleY = timeRef.current * 0.06;
      camera.position.x = Math.cos(angleX) * cameraRadius;
      camera.position.z = Math.sin(angleX) * cameraRadius;
      camera.position.y = Math.sin(angleY) * 35 + 5;
      camera.lookAt(0, 0, 0);
      
      // Rotate stars
      if (starsRef.current) {
        starsRef.current.rotation.y += 0.0001;
      }
      
      // Render directly with transparency
      renderer.render(scene, camera);
    };

    // Start animation
    animate();

    // Auto-transition every 10 seconds
    const autoTransition = setInterval(() => {
      if (!isTransitioningRef.current) {
        const nextPattern = (currentPatternRef.current + 1) % patterns.length;
        currentPatternRef.current = nextPattern;
        transitionToPattern(nextPattern);
      }
    }, 10000);

    // Add event listeners
    window.addEventListener('resize', handleResize);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      clearInterval(autoTransition);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);
      
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      
      if (particles) {
        particles.geometry.dispose();
        if (particles.material instanceof THREE.Material) {
          particles.material.dispose();
        }
      }
      if (starsRef.current) {
        starsRef.current.geometry.dispose();
        if (starsRef.current.material instanceof THREE.Material) {
          starsRef.current.material.dispose();
        }
      }
      renderer.dispose();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full cursor-pointer"
      style={{ minHeight: '400px' }}
    />
  );
};

export default ParticleMorphV2;