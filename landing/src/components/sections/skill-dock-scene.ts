import * as THREE from 'three';
import { gsap } from 'gsap';

import { createSkillDock } from './skill-dock-model';

type DockEvents = {
  highlight: (index: number | null) => void;
  activate: (index: number) => void;
  lost: () => void;
};

const tiltLimit = THREE.MathUtils.degToRad(4);

export function mountSkillDock(host: HTMLDivElement, events: DockEvents) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0, 0);
  const accent = getComputedStyle(host).getPropertyValue('--kit-neon').trim();
  let dock: ReturnType<typeof createSkillDock>;
  try {
    dock = createSkillDock(accent);
  } catch (error) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }

  const scene = new THREE.Scene();
  scene.add(dock.root);
  const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, 0.1, 40);
  camera.position.set(4.3, 4.1, 10);
  camera.lookAt(0, 1, 0);

  const fill = new THREE.HemisphereLight(0xffffff, 0x777777, 1.8);
  const key = new THREE.DirectionalLight(0xffffff, 2.7);
  key.position.set(-3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.normalBias = 0.018;
  const edge = new THREE.DirectionalLight(0xffffff, 2.2);
  edge.position.set(3, 3, -4);
  scene.add(fill, key, edge);

  const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.18 });
  const floorGeometry = new THREE.PlaneGeometry(40, 40);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.66;
  floor.receiveShadow = true;
  scene.add(floor);

  const poses = dock.modules.map(() => ({ entry: 1.25, lift: 0, flash: 0 }));
  let frame = 0;
  let visible = false;
  let disposed = false;
  let exiting = false;
  let highlighted: number | null = null;
  let pointed: number | null = null;
  const canvas = renderer.domElement;
  host.appendChild(canvas);

  function render() {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    dock.modules.forEach(({ cartridge, lamp }, i) => {
      cartridge.position.y = poses[i].entry + poses[i].lift;
      lamp.emissiveIntensity = Math.max(0.035, poses[i].flash, Math.min(0.95, poses[i].lift * 4));
    });
    renderer.render(scene, camera);
    host.dataset.ready = 'true';
  }

  function invalidate() {
    if (!disposed && visible && !document.hidden && !frame) frame = requestAnimationFrame(render);
  }

  const intro = gsap.timeline({ paused: true, onUpdate: invalidate });
  poses.forEach((pose, i) => {
    const start = 0.19 * i;
    intro.to(pose, { entry: 0, duration: 0.65, ease: 'power3.out' }, start)
      .to(pose, { flash: 1, duration: 0.08 }, start + 0.51)
      .to(pose, { flash: 0, duration: 0.32 }, start + 0.59);
  });

  const tiltX = gsap.quickTo(dock.root.rotation, 'x', { duration: 0.36, ease: 'power2.out', onUpdate: invalidate });
  const tiltY = gsap.quickTo(dock.root.rotation, 'y', { duration: 0.36, ease: 'power2.out', onUpdate: invalidate });

  function highlight(index: number | null) {
    if (exiting || index === highlighted) return;
    highlighted = index;
    poses.forEach((pose, i) => {
      gsap.to(pose, { lift: i === index ? 0.19 : 0, duration: 0.22, overwrite: 'auto', onUpdate: invalidate });
    });
  }

  function eject(index: number) {
    if (!visible || document.hidden || exiting) return false;
    exiting = true;
    intro.progress(1).pause();
    poses.forEach((pose, i) => {
      gsap.to(pose, {
        lift: i === index ? 0.92 : 0, duration: 0.22,
        ease: 'power2.out', overwrite: 'auto', onUpdate: invalidate,
      });
    });
    return true;
  }

  function reset() {
    exiting = false;
    highlighted = null;
    pointed = null;
    host.removeAttribute('data-hit');
    poses.forEach((pose) => {
      gsap.killTweensOf(pose, 'lift');
      pose.lift = 0;
    });
    invalidate();
  }

  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const roots = dock.modules.map(({ cartridge }) => cartridge);
  roots.forEach((group, i) => group.traverse((object) => { object.userData.moduleIndex = i; }));

  function hit(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    ray.setFromCamera(mouse, camera);
    const first = ray.intersectObjects(roots, true)[0];
    return first ? first.object.userData.moduleIndex as number : null;
  }

  function point(index: number | null) {
    if (index === pointed) return;
    pointed = index;
    host.toggleAttribute('data-hit', index !== null);
    events.highlight(index);
  }

  function onMove(event: PointerEvent) {
    if (event.pointerType === 'touch' || exiting) return;
    point(hit(event));
    tiltX(-THREE.MathUtils.clamp(mouse.y, -1, 1) * tiltLimit);
    tiltY(THREE.MathUtils.clamp(mouse.x, -1, 1) * tiltLimit);
  }

  function onLeave() {
    point(null);
    tiltX(0);
    tiltY(0);
  }

  let down: { x: number; y: number; id: number; module: number } | null = null;
  function onDown(event: PointerEvent) {
    const index = hit(event);
    down = event.isPrimary && event.button === 0 && index !== null
      ? { x: event.clientX, y: event.clientY, id: event.pointerId, module: index }
      : null;
  }

  function onUp(event: PointerEvent) {
    const start = down;
    down = null;
    if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
    if (hit(event) === start.module) events.activate(start.module);
  }

  function onCancel() { down = null; }

  function resize() {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    const halfHeight = Math.max(2.4, 3.55 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 520 ? 1.35 : 1.75));
    renderer.setSize(width, height, false);
    invalidate();
  }

  function updateTheme() {
    const dark = getComputedStyle(document.documentElement).colorScheme === 'dark';
    dock.setTheme(dark);
    edge.intensity = dark ? 3.3 : 2.2;
    floorMaterial.opacity = dark ? 0.48 : 0.18;
    invalidate();
  }

  function syncVisibility() {
    if (visible && !document.hidden) {
      if (intro.progress() < 1) intro.play();
      invalidate();
    } else {
      intro.pause();
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  const viewport = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncVisibility();
  });
  viewport.observe(host);
  const size = new ResizeObserver(resize);
  size.observe(host);
  const theme = new MutationObserver(updateTheme);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  systemTheme.addEventListener('change', updateTheme);
  document.addEventListener('visibilitychange', syncVisibility);
  canvas.addEventListener('webglcontextlost', events.lost);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  updateTheme();
  resize();

  return {
    highlight, eject, reset,
    dispose() {
      disposed = true;
      viewport.disconnect();
      size.disconnect();
      theme.disconnect();
      systemTheme.removeEventListener('change', updateTheme);
      document.removeEventListener('visibilitychange', syncVisibility);
      canvas.removeEventListener('webglcontextlost', events.lost);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      intro.kill();
      poses.forEach((pose) => gsap.killTweensOf(pose));
      tiltX.tween.kill();
      tiltY.tween.kill();
      cancelAnimationFrame(frame);
      delete host.dataset.ready;
      host.removeAttribute('data-hit');
      canvas.remove();
      dock.dispose();
      key.shadow.dispose();
      floorGeometry.dispose();
      floorMaterial.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
