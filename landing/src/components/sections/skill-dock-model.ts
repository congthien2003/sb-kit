import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { heroSkills } from '@/config/hero-skills';
import { skillLabel } from './skill-label-texture';

export function createSkillDock(accent: string) {
  const root = new THREE.Group();
  const geometries = new Map<string, THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures: THREE.Texture[] = [];

  function finish(color: THREE.ColorRepresentation, metalness = 0.25) {
    const material = new THREE.MeshStandardMaterial({ color, metalness, roughness: 0.43 });
    materials.add(material);
    return material;
  }

  function box(parent: THREE.Group, material: THREE.Material,
    size: [number, number, number], at: [number, number, number], radius = 0.035) {
    const key = [...size, radius].join('/');
    let geometry = geometries.get(key);
    if (!geometry) {
      geometry = new RoundedBoxGeometry(...size, 2, radius);
      geometries.set(key, geometry);
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...at);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const graphite = finish(0x373737);
  const rim = finish(0x878787, 0.55);
  const recess = finish(0x151515, 0.1);
  const silver = finish(0xb8b8b8, 0.46);
  const shells = [finish(0x606060), silver, finish(0x444444)];
  box(root, recess, [5.56, 0.22, 2.12], [0, -0.53, 0], 0.09);
  box(root, graphite, [5.86, 0.56, 2.42], [0, -0.23, 0], 0.11);
  box(root, rim, [5.75, 0.065, 2.32], [0, 0.05, 0]);
  box(root, graphite, [5.68, 0.10, 2.25], [0, 0.11, 0]);
  for (const x of [-2.64, 2.64]) {
    for (const z of [-0.91, 0.91]) {
      box(root, rim, [0.12, 0.025, 0.12], [x, 0.165, z]);
      box(root, recess, [0.062, 0.013, 0.014], [x, 0.181, z], 0.004);
    }
  }

  const modules = heroSkills.map(({ name }, index) => {
    const x = (index - 1) * 1.68;
    box(root, recess, [1.56, 0.07, 0.73], [x, 0.17, -0.04]);
    const lamp = finish(accent, 0.1);
    lamp.emissive.set(accent);
    lamp.emissiveIntensity = 0.03;
    lamp.color.set(0x4e4e4e);
    box(root, lamp, [0.66, 0.035, 0.056], [x, 0.17, 0.7], 0.014);

    const cartridge = new THREE.Group();
    cartridge.position.set(x, 0, -0.04);
    root.add(cartridge);
    box(cartridge, shells[index], [1.38, 1.88, 0.44], [0, 1.05, 0], 0.085);
    box(cartridge, recess, [1.21, 0.22, 0.32], [0, 0.085, 0]);
    for (let pin = 0; pin < 7; pin++) {
      box(cartridge, silver, [0.095, 0.15, 0.026], [-0.46 + pin * 0.153, 0.075, 0.166], 0.006);
    }
    const label = skillLabel(name, index);
    textures.push(label);
    const face = new THREE.MeshBasicMaterial({ map: label });
    materials.add(face);
    const geometry = new THREE.PlaneGeometry(1.17, 1.31);
    geometries.set('face-' + index, geometry);
    const plate = new THREE.Mesh(geometry, face);
    plate.position.set(0, 1.06, 0.224);
    cartridge.add(plate);
    for (let ridge = 0; ridge < 5; ridge++) {
      box(cartridge, recess, [0.076, 0.045, 0.26], [-0.32 + ridge * 0.16, 1.985, 0], 0.012);
    }
    return { cartridge, lamp };
  });

  return {
    root, modules,
    setTheme(dark: boolean) {
      graphite.color.set(dark ? 0x555555 : 0x373737);
      rim.color.set(dark ? 0xbdbdbd : 0x878787);
    },
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    },
  };
}
