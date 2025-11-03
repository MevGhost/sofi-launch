'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ParticleMorphCubeProps {
  particleCount?: number;
}

const ParticleMorphCube: React.FC<ParticleMorphCubeProps> = ({ 
  particleCount = 15000
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initialize Three.js
    const scene = new THREE.Scene();
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
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Color palettes from old frontend - S4Labs blue colors only
    const colorPalette = [
      new THREE.Color(0x0052FF), // Deep Blue
      new THREE.Color(0x0EA5E9), // Electric Blue
      new THREE.Color(0x06B6D4), // Light Cyan
      new THREE.Color(0x0077FF)  // Bright Blue
    ];

    // Create grid pattern - EXACT from old frontend
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

    // Create particle system
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const indices = new Float32Array(particleCount);
    const particleTypes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      indices[i] = i;
      particleTypes[i] = Math.floor(Math.random() * 3);
      
      const pos = createGrid(i, particleCount);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const colorIndex = Math.floor(Math.random() * colorPalette.length);
      const baseColor = colorPalette[colorIndex];
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

    // Shader from old frontend - without mouse interaction
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        uniform float time;
        attribute float size;
        attribute float index;
        attribute float particleType;
        varying vec3 vColor;
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
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          float perspectiveFactor = 700.0 / -mvPosition.z;
          gl_PointSize = size * perspectiveFactor;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vColor;
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

    const particles = new THREE.Points(geometry, material);
    particlesRef.current = particles;
    scene.add(particles);

    // Clock for time tracking
    const clock = new THREE.Clock();
    let timeValue = 0;

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer || !container) return;
      camera.aspect = container.offsetWidth / container.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.offsetWidth, container.offsetHeight);
    };

    // Animation loop - slow space rotation
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      const deltaTime = clock.getDelta();
      timeValue += deltaTime;
      
      // Update shader time
      material.uniforms.time.value = timeValue;
      
      // Slow rotation like floating in space
      if (particles) {
        particles.rotation.x += 0.0003;
        particles.rotation.y += 0.0005;
        particles.rotation.z += 0.0002;
      }
      
      renderer.render(scene, camera);
    };

    window.addEventListener('resize', handleResize);
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      
      if (container && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [particleCount]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
};

export default ParticleMorphCube;