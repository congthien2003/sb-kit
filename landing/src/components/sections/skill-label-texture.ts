import * as THREE from 'three';

export function skillLabel(name: string, index: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  // Screen-printed labels give each cartridge a distinct face at small sizes.
  const light = index === 1;
  ctx.fillStyle = light ? '#e4e4e4' : '#242424';
  ctx.fillRect(0, 0, 512, 512);
  const ink = light ? '#242424' : '#f5f5f5';
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (index === 0) {
    ctx.beginPath();
    ctx.moveTo(46, 56); ctx.lineTo(89, 92); ctx.lineTo(46, 128);
    ctx.moveTo(105, 129); ctx.lineTo(164, 129);
    ctx.stroke();
  } else if (index === 1) {
    for (let n = 2; n >= 0; n--) {
      ctx.fillStyle = '#e4e4e4';
      ctx.fillRect(46 + n * 17, 52 + n * 12, 74, 87);
      ctx.strokeRect(46 + n * 17, 52 + n * 12, 74, 87);
    }
  } else {
    for (const y of [67, 117]) {
      ctx.strokeRect(46, y, 110, 33);
      ctx.fillRect(59, y + 12, 12, 8);
    }
  }
  ctx.fillStyle = ink;
  ctx.font = '600 24px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('sb-kit', 472, 84);
  ctx.textAlign = 'left';
  ctx.font = 'bold 50px monospace';
  const parts = name.split('-');
  ctx.fillText(parts.slice(0, 2).join('-'), 38, 259);
  if (parts.length > 2) ctx.fillText('-' + parts.slice(2).join('-'), 38, 321);
  ctx.fillRect(38, 383, 436, 3);
  for (let x = 39; x < 450; x += 12) ctx.fillRect(x, 411, 3, x % 3 === 0 ? 24 : 14);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
