'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three-stdlib';
import { RenderPass } from 'three-stdlib';
import { UnrealBloomPass } from 'three-stdlib';

const ParticleMorph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const timeRef = useRef(0);
  const mouseRef = useRef({ x: 10000, y: 10000 });
  const frameRef = useRef<number>();
  const currentPatternRef = useRef(0);

  // S4Labs color palette
  const colorPalettes = [
    [
      new THREE.Color(0x0052FF), // Deep Blue
      new THREE.Color(0x0EA5E9), // Electric Blue
      new THREE.Color(0x06B6D4), // Light Cyan
      new THREE.Color(0x0077FF), // Bright Blue
    ],
    [
      new THREE.Color(0x0EA5E9),
      new THREE.Color(0x06B6D4),
      new THREE.Color(0x0052FF),
      new THREE.Color(0x00AAFF),
    ],
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
    const angle = Math.pow(t, 0.7) * 15;
    const radius = t * 40;
    const height = Math.sin(t * Math.PI * 2) * 5;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      height
    );
  };

  const createHelix = (i: number, count: number) => {
    const t = i / count;
    const angle = t * Math.PI * 10;
    const radius = 15;
    const height = (t - 0.5) * 60;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      height
    );
  };

  // Store transition function ref to be set in useEffect
  const transitionFunctionRef = useRef<(() => void) | null>(null);
  
  // Handle click event
  const handleClick = React.useCallback(() => {
    if (transitionFunctionRef.current) {
      transitionFunctionRef.current();
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const particleCount = 5000; // Reduced for performance
    const patterns = [createSphere, createSpiral, createHelix];
    let currentPattern = 0;

    // Initialize Three.js
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
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
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Create particle system
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const initialPattern = patterns[0];
    const initialPalette = colorPalettes[0];

    for (let i = 0; i < particleCount; i++) {
      const pos = initialPattern(i, particleCount);
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      const colorIndex = Math.floor(Math.random() * initialPalette.length);
      const baseColor = initialPalette[colorIndex];
      colors[i * 3] = baseColor.r;
      colors[i * 3 + 1] = baseColor.g;
      colors[i * 3 + 2] = baseColor.b;
      
      sizes[i] = 1.0 + Math.random() * 1.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mousePos: { value: new THREE.Vector3(10000, 10000, 0) },
      },
      vertexShader: `
        uniform float time;
        uniform vec3 mousePos;
        attribute float size;
        varying vec3 vColor;
        
        void main() {
          vColor = color;
          vec3 pos = position;
          
          // Add subtle animation
          float T = time * 0.5;
          pos.x += sin(T + position.y * 0.1) * 0.5;
          pos.y += cos(T + position.x * 0.1) * 0.5;
          pos.z += sin(T + position.z * 0.1) * 0.5;
          
          // Mouse interaction
          vec3 toMouse = mousePos - pos;
          float dist = length(toMouse);
          if (dist < 30.0) {
            vec3 repelDir = normalize(pos - mousePos);
            pos += repelDir * (30.0 - dist) * 0.5;
          }
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = size * (300.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vColor;
        
        void main() {
          vec2 uv = gl_PointCoord * 2.0 - 1.0;
          float dist = length(uv);
          if (dist > 1.0) discard;
          
          float alpha = pow(1.0 - dist, 2.0);
          vec3 finalColor = vColor + vec3(0.1, 0.1, 0.2) * sin(time * 0.5);
          
          gl_FragColor = vec4(finalColor * alpha, alpha * 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    const particles = new THREE.Points(geometry, material);
    particlesRef.current = particles;
    scene.add(particles);

    // Post-processing
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3, // strength
      0.4, // radius
      0.85 // threshold
    );
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // Mouse interaction
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    // Pattern transition function
    const transitionPattern = () => {
      currentPattern = (currentPattern + 1) % patterns.length;
      const newPattern = patterns[currentPattern];
      const newPalette = colorPalettes[currentPattern % colorPalettes.length];
      
      const positions = geometry.attributes.position.array as Float32Array;
      const colors = geometry.attributes.color.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const pos = newPattern(i, particleCount);
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
        
        const colorIndex = Math.floor(Math.random() * newPalette.length);
        const baseColor = newPalette[colorIndex];
        colors[i * 3] = baseColor.r;
        colors[i * 3 + 1] = baseColor.g;
        colors[i * 3 + 2] = baseColor.b;
      }
      
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      currentPatternRef.current = currentPattern;
    };
    
    // Store the transition function for external access
    transitionFunctionRef.current = transitionPattern;
    
    // Auto-transition patterns
    const patternInterval = setInterval(transitionPattern, 8000);

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer || !composer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      timeRef.current += 0.01;
      
      if (material.uniforms.time) {
        material.uniforms.time.value = timeRef.current;
      }
      
      // Update mouse position
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(
        new THREE.Vector2(mouseRef.current.x, mouseRef.current.y),
        camera
      );
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersectPoint = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
        material.uniforms.mousePos.value.lerp(intersectPoint, 0.1);
      }
      
      // Rotate particles slowly
      if (particles) {
        particles.rotation.y += 0.0005;
        particles.rotation.x += 0.0002;
      }
      
      composer.render();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    animate();

    // Cleanup
    return () => {
      clearInterval(patternInterval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full cursor-pointer"
      onClick={handleClick}
    />
  );
};

export default ParticleMorph;