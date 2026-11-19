import * as THREE from 'three';

import type { BoardStep, Playback } from './ExecuteBoard';
import { skillLabel } from './skill-label-texture';

function stationBadge(text: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#232323';
  ctx.fillRect(0, 0, 96, 96);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 60px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (text === '✓') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 9;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(20, 48);
    ctx.lineTo(40, 65);
    ctx.lineTo(76, 28);
    ctx.stroke();
  } else {
    ctx.fillText(text, 48, 51);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function mountExecutionBoard(
  host: HTMLDivElement, steps: BoardStep[], clock: () => Playback,
  duration: number, onLoss: () => void,
) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 3, -3, 0.1, 40);
  const body = new THREE.BoxGeometry();
  const decal = new THREE.PlaneGeometry();
  const bead = new THREE.SphereGeometry(0.105, 12, 10);
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  function surface(color: THREE.ColorRepresentation) {
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.52 });
    materials.push(material);
    return material;
  }

  function printed(parent: THREE.Group, texture: THREE.Texture, width: number, depth: number, height: number) {
    textures.push(texture);
    const ink = new THREE.MeshBasicMaterial({ map: texture });
    materials.push(ink);
    const face = new THREE.Mesh(decal, ink);
    face.scale.set(width, depth, 1);
    face.rotation.x = -Math.PI / 2;
    face.position.y = height;
    parent.add(face);
    return ink;
  }

  function block(parent: THREE.Object3D, material: THREE.Material, w: number, h: number, d: number) {
    const mesh = new THREE.Mesh(body, material);
    mesh.scale.set(w, h, d);
    parent.add(mesh);
    return mesh;
  }

  const pcb = surface(0x303030);
  const dark = surface(0x202020);
  const silver = surface(0xb8b8b8);
  const trace = surface(0x828282);
  const neon = new THREE.MeshBasicMaterial({ color: getComputedStyle(host).getPropertyValue('--kit-neon').trim() });
  materials.push(neon);
  const panel = block(scene, pcb, 1, 0.21, 1);
  panel.position.y = -0.16;
  const substrate = block(scene, dark, 1, 0.09, 1);
  substrate.position.y = -0.29;

  const cartridge = new THREE.Group();
  scene.add(cartridge);
  block(cartridge, silver, 1.04, 0.38, 1.18).position.y = 0.18;
  printed(cartridge, skillLabel('sk-excute', 0), 0.89, 0.99, 0.375);
  const check = stationBadge('✓');
  textures.push(check);
  const stations = steps.map(({ approval }, i) => {
    const station = new THREE.Group();
    scene.add(station);
    block(station, dark, 1.18, 0.10, 1.15);
    const tile = new THREE.Group();
    station.add(tile);
    const edge = block(tile, silver, 0.96, 0.10, 0.88);
    block(tile, dark, 0.92, 0.22, 0.84).position.y = 0.14;
    const number = stationBadge(String(i + 1));
    const ink = printed(tile, number, 0.6, 0.6, 0.254);
    for (const side of [-1, 1]) {
      for (const x of [-0.32, 0, 0.32]) {
        block(station, silver, 0.10, 0.065, 0.16).position.set(x, 0.065, side * 0.49);
      }
    }

    const lane = new THREE.Group();
    scene.add(lane);
    const wire = block(lane, trace, 0.09, 0.025, 1);
    wire.position.y = 0.02;
    const lit = block(lane, neon, 0.052, 0.025, 1);
    lit.position.y = 0.047;
    let hinge: THREE.Group | null = null;
    let gate: THREE.Group | null = null;
    if (approval) {
      gate = new THREE.Group();
      lane.add(gate);
      for (const side of [-1, 1]) {
        block(gate, silver, 0.11, 0.35, 0.14).position.set(side * 0.34, 0.16, 0);
      }
      hinge = new THREE.Group();
      hinge.position.set(-0.34, 0.35, 0);
      gate.add(hinge);
      block(hinge, neon, 0.68, 0.11, 0.12).position.x = 0.34;
    }
    return { station, tile, edge, ink, number, lane, wire, lit, gate, hinge, length: 0 };
  });

  const signal = new THREE.Mesh(bead, neon);
  scene.add(signal, new THREE.HemisphereLight(0xffffff, 0x666666, 2.15));
  const light = new THREE.DirectionalLight(0xffffff, 2.6);
  light.position.set(-3, 6, 2);
  scene.add(light);
  const screws = Array.from({ length: 4 }, () => block(scene, silver, 0.115, 0.04, 0.115));

  let frame = 0;
  let visible = false;
  let disposed = false;
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const pitch = 2.2;
  const inlet = pitch * 0.75;
  const viewWidth = inlet + stations.length * pitch;
  // The scrolling track contains both the scene and its HTML legend.
  host.parentElement?.style.setProperty('--inlet-width', `${100 * inlet / viewWidth}%`);

  function layout() {
    const left = -viewWidth / 2;
    const width = viewWidth - 0.3;
    const depth = 2.15;
    panel.scale.set(width, 0.21, depth);
    substrate.scale.set(width - 0.12, 0.09, depth - 0.12);
    screws.forEach((screw, i) => screw.position.set(
      (i % 2 ? 1 : -1) * (width / 2 - 0.17), -0.035,
      (i < 2 ? 1 : -1) * (depth / 2 - 0.17),
    ));
    cartridge.position.set(left + inlet / 2, 0, 0);
    let previous = cartridge.position;
    stations.forEach((s, i) => {
      s.station.position.set(left + inlet + (i + 0.5) * pitch, 0.08, 0);
      const dx = s.station.position.x - previous.x;
      const dz = s.station.position.z - previous.z;
      s.length = Math.hypot(dx, dz);
      s.lane.position.set(previous.x, 0, previous.z);
      s.lane.rotation.y = Math.atan2(dx, dz);
      s.wire.scale.z = s.length;
      s.wire.position.z = s.length / 2;
      if (s.gate) s.gate.position.z = s.length * 0.52;
      previous = s.station.position;
    });

    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    camera.position.set(0, 12, 7);
    camera.lookAt(0, 0, 0);
    const aspect = w / h;
    const halfHeight = viewWidth / (2 * aspect);
    camera.left = left;
    camera.right = -left;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h, false);
    refresh();
  }

  function refresh() {
    if (!frame && visible && !document.hidden && !disposed) frame = requestAnimationFrame(draw);
  }

  function draw(now: number) {
    frame = 0;
    if (!visible || disposed || document.hidden) return;
    const { position, startedAt } = clock();
    const progress = THREE.MathUtils.clamp((now - startedAt) / duration, 0, 1);
    signal.visible = position >= 0 && position < stations.length;
    stations.forEach((s, i) => {
      const done = i < position;
      const active = i === position;
      let travel = done ? 1 : 0;
      if (active) {
        // Hold the pulse just before the crossing while the arm lifts.
        if (s.gate && progress < 0.56) travel = Math.min(0.43, progress / 0.30 * 0.43);
        else if (s.gate) travel = Math.min(1, 0.43 + (progress - 0.56) / 0.30 * 0.57);
        else travel = Math.min(1, progress / 0.78);
      }
      s.lit.visible = travel > 0;
      s.lit.scale.z = s.length * travel;
      s.lit.position.z = s.lit.scale.z / 2;
      s.tile.position.y = active ? 0.11 + 0.26 * Math.sin(Math.PI * progress) : 0.11;
      s.edge.material = active ? neon : silver;
      s.ink.map = done ? check : s.number;
      if (s.hinge) {
        const opening = active ? THREE.MathUtils.smoothstep(progress, 0.32, 0.56) : Number(done);
        s.hinge.rotation.z = opening * Math.PI * 0.46;
      }
      if (active) {
        const origin = s.lane.position;
        signal.position.lerpVectors(origin, s.station.position, travel);
        // Keep the pulse visible as it leaves and arrives on top of a tile.
        const atEnds = Math.abs(travel - 0.5) * 2;
        signal.position.y = 0.14 + THREE.MathUtils.smoothstep(atEnds, 0.35, 0.7) * (s.tile.position.y + 0.31);
      }
    });
    try {
      renderer.render(scene, camera);
    } catch {
      onLoss();
      return;
    }
    if (signal.visible && progress < 1) refresh();
  }

  function updateTheme() {
    const darkTheme = getComputedStyle(document.documentElement).colorScheme === 'dark';
    pcb.color.set(darkTheme ? 0x494949 : 0x343434);
    trace.color.set(darkTheme ? 0xb0b0b0 : 0x949494);
    refresh();
  }

  function onVisibility() {
    if (visible && !document.hidden) refresh();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  host.appendChild(canvas);
  host.dataset.ready = 'true';
  canvas.addEventListener('webglcontextlost', onLoss);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    onVisibility();
  });
  observer.observe(host);
  const size = new ResizeObserver(layout);
  size.observe(host);
  const theme = new MutationObserver(updateTheme);
  theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  systemTheme.addEventListener('change', updateTheme);
  document.addEventListener('visibilitychange', onVisibility);
  layout();
  updateTheme();

  return {
    refresh,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      size.disconnect();
      theme.disconnect();
      systemTheme.removeEventListener('change', updateTheme);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLoss);
      canvas.remove();
      delete host.dataset.ready;
      body.dispose();
      decal.dispose();
      bead.dispose();
      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
