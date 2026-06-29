import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

export default function BlackHole({ size = 420, dragOver = false, sending = false, progress = 0, completed = false }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const particleSystemRef = useRef(null);
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

    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = [];

    const purple = new THREE.Color('#A78BFA');
    const cyan = new THREE.Color('#06B6D4');
    const primary = new THREE.Color('#7C3AED');

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 1.8;
      const phi = (Math.random() - 0.5) * 0.5;

      positions[i * 3] = Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.sin(theta) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      const c = Math.random() < 0.4 ? purple : Math.random() < 0.5 ? cyan : primary;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = 0.02 + Math.random() * 0.04;
      velocities.push({
        theta,
        radius,
        speed: 0.2 + Math.random() * 0.5,
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
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const ringGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const r = 0.35 + i * 0.25;
      const ringGeo = new THREE.RingGeometry(r - 0.01, r + 0.01, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.3 - i * 0.05, 0.15 - i * 0.02, 0.6 - i * 0.05),
        transparent: true,
        opacity: 0.12 - i * 0.02,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI * 0.85;
      ring.rotation.z = i * 0.3;
      ring.scale.y = 0.2;
      ringGroup.add(ring);
    }
    scene.add(ringGroup);

    const glowGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x7C3AED,
      transparent: true,
      opacity: 0.15,
    });
    const glowSphere = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glowSphere);

    const coreGeo = new THREE.SphereGeometry(0.12, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const coreSphere = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreSphere);

    sceneRef.current = { scene, camera, renderer, particles, particleVelocities: velocities, ringGroup, ringMeshes: ringGroup.children };

    return renderer;
  }, [size]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || sceneRef.current) return;

    const renderer = initScene(container);

    function animate() {
      timeRef.current += 0.016;

      const { particles, particleVelocities, ringGroup, scene } = sceneRef.current;
      if (!particles) return;

      const positions = particles.geometry.attributes.position.array;
      const pull = dragOver ? 0.025 : sending ? 0.018 : completed ? -0.005 : 0.008;

      for (let i = 0; i < particleVelocities.length; i++) {
        const v = particleVelocities[i];
        v.theta += v.speed * 0.02 * (1 + dragOver * 2);
        v.radius -= pull * (1 + Math.random() * 0.5);

        if (v.radius < 0.05) {
          v.radius = 0.3 + Math.random() * 1.8;
          v.theta = Math.random() * Math.PI * 2;
        }

        positions[i * 3] = Math.cos(v.theta) * v.radius;
        positions[i * 3 + 1] = Math.sin(v.theta) * v.radius;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      particles.material.opacity = dragOver ? 1 : sending ? 0.9 : 0.8;
      particles.material.size = dragOver ? 0.04 : sending ? 0.035 : 0.03;

      ringGroup.rotation.z += 0.005 * (1 + dragOver * 2);
      ringGroup.rotation.x = Math.PI * 0.85 + Math.sin(timeRef.current * 0.2) * 0.05;

      renderer.render(scene, sceneRef.current.camera);
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
  }, [size, dragOver, sending, completed, initScene]);

  return (
    <div ref={containerRef} className="relative" style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden' }}>
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        style={{ borderRadius: '50%' }}
      >
        {sending && progress > 0 && (
          <span className="text-bw-cyan font-jetbrains-mono text-sm font-bold">
            {Math.round(progress)}%
          </span>
        )}
        {dragOver && (
          <span className="text-bw-purple font-space-grotesk font-bold text-lg" style={{ opacity: 0.8 }}>
            DROP
          </span>
        )}
        {completed && (
          <span className="text-bw-green font-space-grotesk font-bold text-2xl">
            ✓
          </span>
        )}
      </div>
    </div>
  );
}
