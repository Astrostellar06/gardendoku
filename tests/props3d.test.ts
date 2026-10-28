import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { THEMES } from '../src/render/themes';
import { STYLE_MODELS } from '../src/render3d/props';
import { Kit } from '../src/render3d/props/kit';
import { PartsBuilder } from '../src/render3d/models';

describe('3D props', () => {
  it.each(THEMES.map((t) => [t.id, t] as const))('%s: every model builds, low poly and of a sensible size', (id, theme) => {
    const models = STYLE_MODELS[id] ?? {};
    for (const def of theme.props) {
      const model = models[def.id];
      if (!model) continue;
      for (const v of [0.1, 0.6, 0.9]) {
        const pb = new PartsBuilder();
        const kit = new Kit(pb, new THREE.Matrix4(), new THREE.Vector3(), 0.3, 1);
        model(kit, { v, v2: 1 - v, canalHalf: 1.9, waterY: -0.55 });
        expect(pb.empty, `${def.id}: no shape`).toBe(false);
        const g = pb.build();
        const pos = g.attributes.position;
        expect(pos.count / 3, `${def.id}: triangles`).toBeLessThan(2500);
        g.computeBoundingBox();
        const b = g.boundingBox!;
        for (const n of [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z]) expect(Number.isFinite(n), `${def.id}: finite`).toBe(true);
        expect(b.max.y, `${def.id}: height`).toBeLessThan(4);
        expect(Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z), `${def.id}: width`).toBeLessThan(3.5);
      }
    }
  });

  it('lists the props still shown as paper cut-outs', () => {
    const missing = THEMES.flatMap((t) => t.props.filter((d) => !STYLE_MODELS[t.id]?.[d.id]).map((d) => `${t.id}/${d.id}`));
    console.log(`${missing.length} props without a 3D model${missing.length ? `: ${missing.join(', ')}` : ''}`);
  });
});
