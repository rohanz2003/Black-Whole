import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

export default function BlackHole({ size = 420, dragOver = false, sending = false, progress = 0, completed = false }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const animFrameRef = useRef(null);
  const timeRef = useRef(0);

  const initScene = useCallback((container) => {
    const w = size;
    const h = size;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.z = 3.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ── Accretion disk particles ──────────────────────────────
    const particleCount = 3000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = [];

    const purple = new THREE.Color('#A78BFA');
    const cyan = new THREE.Color('#06B6D4');
    const primary = new THREE.Color('#7C3AED');
    const white = new THREE.Color('#F8FAFC');

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.2 + Math.random() * 2.0;
      const phi = (Math.random() - 0.5) * 0.6;

      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(theta) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      const rand = Math.random();
      const c = rand < 0.35 ? purple : rand < 0.55 ? cyan : rand < 0.75 ? primary : white;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = 0.015 + Math.random() * 0.045;
      velocities.push({
        theta,
        radius,
        speed: 0.15 + Math.random() * 0.6,
        phi,
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ── Accretion rings ───────────────────────────────────────
    const ringGroup = new THREE.Group();
    const ringColors = [
      new THREE.Color('#7C3AED'),
      new THREE.Color('#A78BFA'),
      new THREE.Color('#06B6D4'),
      new THREE.Color('#8B5CF6'),
    ];
    for (let i = 0; i < 6; i++) {
      const r = 0.3 + i * 0.2;
      const ringGeo = new THREE.RingGeometry(r - 0.008, r + 0.008, 80);
      const ringMat = new THREE.MeshBasicMaterial({
        color: ringColors[i % ringColors.length],
        transparent: true,
        opacity: 0.15 - i * 0.018,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI * 0.82;
      ring.rotation.z = i * 0.25;
      ring.scale.y = 0.18;
      ringGroup.add(ring);
    }
    scene.add(ringGroup);

    // ── Glow sphere ───────────────────────────────────────────
    const glowGeo = new THREE.SphereGeometry(0.3, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x7C3AED,
      transparent: true,
      opacity: 0.2,
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glowSphere);

    const glowInner = new THREE.SphereGeometry(0.18, 32, 32);
    const glowInnerMat = new THREE.MeshBasicMaterial({
      color: 0xA78BFA,
      transparent: true,
      opacity: 0.15,
    });
    const glowInnerMesh = new THREE.Mesh(glowInner, glowInnerMat);
    scene.add(glowInnerMesh);

    // ── Core (black sphere) ───────────────────────────────────
    const coreGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreSphere);

    sceneRef.current = {
      scene, camera, renderer,
      particles, particleVelocities: velocities,
      ringGroup, glowSphere, glowInnerMesh,
    };

    return renderer;
  }, [size]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || sceneRef.current) return;

    const renderer = initScene(container);

    function animate() {
      timeRef.current += 0.016;

      const {
        particles, particleVelocities, ringGroup, glowSphere, glowInnerMesh, scene, camera,
      } = sceneRef.current;
      if (!particles) return;

      const positions = particles.geometry.attributes.position.array;

      // Determine pull strength
      const intensity = dragOver ? 1 : sending ? 0.7 + Math.min(progress / 100, 1) * 0.3 : completed ? -0.3 : 0.3;
      const pull = dragOver ? 0.035 : sending ? 0.022 + (progress / 100) * 0.018 : completed ? -0.006 : 0.01;
      const spinMultiplier = dragOver ? 3 : sending ? 2 + (progress / 100) * 1 : completed ? 1 : 1;

      for (let i = 0; i < particleVelocities.length; i++) {
        const v = particleVelocities[i];
        v.theta += v.speed * 0.02 * spinMultiplier;
        v.radius -= pull * (1 + Math.random() * 0.4);

        if (v.radius < 0.04) {
          v.radius = 0.3 + Math.random() * 1.8;
          v.theta = Math.random() * Math.PI * 2;
        }

        positions[i * 3] = Math.cos(v.theta) * v.radius;
        positions[i * 3 + 1] = Math.sin(v.theta) * v.radius;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Particle visual feedback
      particles.material.opacity = 0.6 + 0.4 * intensity;
      particles.material.size = 0.02 + 0.025 * intensity;

      // Ring spin faster when pulling
      ringGroup.rotation.z += 0.006 * spinMultiplier;
      ringGroup.rotation.x = Math.PI * 0.82 + Math.sin(timeRef.current * 0.3) * 0.04;

      // Glow pulse
      const glowPulse = 0.15 + 0.15 * Math.sin(timeRef.current * 2);
      glowSphere.material.opacity = glowPulse * (0.5 + 0.5 * intensity);
      glowInnerMesh.material.opacity = glowPulse * 0.5 * intensity;

      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (renderer) {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      sceneRef.current = null;
    };
  }, [size, dragOver, sending, completed, progress, initScene]);

  return (
    <div ref={containerRef} className="relative" style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden' }}>
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{ borderRadius: '50%' }}
      >
        {sending && progress > 0 && (
          <span className="text-bw-cyan font-jetbrains-mono text-sm font-bold" style={{ textShadow: '0 0 15px rgba(6,182,212,0.6)' }}>
            {Math.round(progress)}%
          </span>
        )}
        {dragOver && (
          <span className="text-bw-purple-lt font-space-grotesk font-bold text-lg tracking-widest animate-breathe" style={{ textShadow: '0 0 20px rgba(167,139,250,0.5)' }}>
            DROP
          </span>
        )}
        {completed && (
          <span className="text-bw-green font-space-grotesk font-bold text-2xl" style={{ textShadow: '0 0 15px rgba(16,185,129,0.5)' }}>
            ✓
          </span>
        )}
      </div>
    </div>
  );
}
