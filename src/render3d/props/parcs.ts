/** Great national parks in 3D: pines, bison, bears, geysers, hot springs, ranger cabins, elk and trout. */
import { pine3d, quadruped, rock3d } from './common';
import type { ModelMap } from './kit';
import { gableRoof, plank3d, sideEyes } from './montagne';

export const parcs: ModelMap = {
  'park-pine': pine3d('#3F8F6A', '#55A67D'),
  bison(k, { v }) {
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      for (const x of [-0.45, 0.3]) for (const z of [-0.18, 0.18]) k.cyl('#5E4438', [x, 0, z], 0.08, 0.5, { sides: 5 });
      k.ball(['#7A5A42', '#8A6248'], [-0.2, 0.62, 0], [0.5, 0.3, 0.36]);
      // Shaggy hump and low head.
      k.ball('#6E4E3E', [0.2, 0.8, 0], [0.42, 0.42, 0.4]);
      k.ball('#7E5C48', [0.12, 1.05, 0], [0.26, 0.18, 0.3], { sides: 0 });
      k.ball('#5E4438', [0.58, 0.6, 0], [0.2, 0.24, 0.22]);
      k.ball('#4A3530', [0.64, 0.38, 0], [0.1, 0.12, 0.1], { sides: 0 });
      for (const z of [-0.15, 0.15]) k.stick('#E8DCC8', [0.55, 0.76, z], [0.5, 0.92, z * 1.7], 0.06);
      sideEyes(k, 0.7, 0.66, 0.13);
      k.stick('#5E4438', [-0.68, 0.72, 0], [-0.78, 0.45, 0], 0.05);
    });
  },
  bear(k, { v }) {
    const fur = '#9A6A4A';
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      for (const x of [-0.4, 0.3]) for (const z of [-0.2, 0.2]) k.cyl('#86593C', [x, 0, z], 0.12, 0.5);
      k.ball(fur, [-0.05, 0.65, 0], [0.6, 0.4, 0.42]);
      k.ball(fur, [0.55, 0.85, 0], [0.27, 0.25, 0.25]);
      for (const z of [-0.15, 0.15]) k.ball(fur, [0.48, 1.08, z], [0.09, 0.09, 0.06], { sides: 0 });
      k.ball('#C9966E', [0.78, 0.8, 0], [0.13, 0.1, 0.11], { sides: 0 });
      k.ball('#2E2428', [0.9, 0.83, 0], [0.045, 0.045, 0.045], { sides: 0 });
      sideEyes(k, 0.72, 0.92, 0.11);
    });
  },
  geyser(k) {
    k.dome('#E8DCC8', [0, 0, 0], [0.75, 0.15, 0.6]);
    k.cyl('#F4C060', [0, 0.08, 0], 0.45, 0.06, { sides: 8, rz: 0.38 });
    k.cyl('#7FD6F0', [0, 0.1, 0], 0.25, 0.06, { sides: 8, rz: 0.21 });
    // Caught mid-eruption.
    k.cyl('#FFFFFF', [0, 0.1, 0], 0.12, 1.6, { top: 0.5 });
    k.ball('#FFFFFF', [0, 1.75, 0], [0.25, 0.22, 0.25], { sides: 0 });
    k.ball('#F4FAFF', [0.22, 1.2, 0.1], [0.15, 0.15, 0.15], { sides: 0 });
    k.ball('#F4FAFF', [-0.2, 0.8, -0.05], [0.18, 0.18, 0.18], { sides: 0 });
  },
  'hot-spring'(k, { v }) {
    // Rainbow rings like the Grand Prismatic Spring; the blue deepens with the water.
    k.at([0, 0, 0], v * 6.28, 1, () => {
      const ring = (c: string, r: number, h: number) => k.cyl(c, [0, 0, 0], r, h, { sides: 12, rz: r * 0.84 });
      ring('#F29A4A', 0.95, 0.04);
      ring('#F7C85A', 0.8, 0.06);
      ring('#CFE58A', 0.66, 0.08);
      ring('#9CCFD8', 0.54, 0.1);
      ring('#7FB8C8', 0.34, 0.11);
      k.bloom(0.4, () => {
        ring('#5FD0E8', 0.545, 0.105);
        ring('#2FA8D8', 0.345, 0.115);
        k.ball('#FFFFFF', [0.1, 0.35, 0], [0.15, 0.12, 0.15], { sides: 0 });
      });
    });
  },
  'ranger-cabin'(k) {
    k.box('#B97F4E', [0, 0, 0], [1.4, 1.0, 1.1]);
    for (const y of [0.2, 0.45, 0.7]) k.box('#9A6A3E', [0, y, 0], [1.42, 0.05, 1.12]);
    gableRoof(k, 1.4, 1.1, 1.0, 0.6, '#B97F4E', '#7FA06A', '#6E8E5A');
    k.box('#A8A0A8', [0.43, 1.2, -0.1], [0.16, 0.55, 0.16]);
    k.box('#7A5547', [-0.15, 0, 0.55], [0.36, 0.6, 0.03]);
    k.box('#CFE6F2', [0.42, 0.42, 0.55], [0.28, 0.25, 0.03]);
    k.bloom(0.5, () => k.box('#FFE9A0', [0.42, 0.43, 0.565], [0.24, 0.22, 0.02]));
  },
  elk(k, { v }) {
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      quadruped(k, { body: '#C98E5E', legs: '#A8744A', size: [0.48, 0.26], neck: 0.3, legLen: 0.5 });
      const [hx, hy] = [0.456, 0.98];
      k.stick('#8A5E3E', [0.34, 0.66, 0], [hx, hy, 0], 0.22, 5);
      k.ball('#F2E2C8', [-0.45, 0.65, 0], [0.12, 0.13, 0.26], { sides: 0 });
      // Antlers.
      for (const z of [-0.1, 0.1]) {
        k.stick('#E8D8BC', [hx - 0.05, hy + 0.15, z], [hx - 0.25, hy + 0.7, z * 2.5], 0.05);
        k.stick('#E8D8BC', [hx - 0.12, hy + 0.35, z * 1.6], [hx + 0.06, hy + 0.48, z * 1.8], 0.04);
        k.stick('#E8D8BC', [hx - 0.2, hy + 0.56, z * 2.2], [hx - 0.38, hy + 0.66, z * 2.4], 0.04);
      }
    });
  },
  rock: rock3d('#C9C3BE', '#A8A19A', '#E8E4E0', '#8FCF86'),
  'plank-bridge': plank3d('#B98A5E', '#A67648', '#7A5A3E'),
  trout(k, { v }) {
    // Back just breaking the surface, head toward +z.
    k.at([0, 0, 0], v > 0.5 ? 0 : Math.PI, 1, () => {
      k.ball('#A8C0B4', [0, -0.02, 0], [0.28, 0.16, 0.85]);
      k.ball('#F29A9A', [0, 0.05, 0], [0.12, 0.1, 0.7], { sides: 0 });
      for (const [x, z] of [
        [-0.12, 0.3],
        [0.12, 0],
        [-0.1, -0.3],
      ]) {
        k.ball('#5E7068', [x, 0.1, z], [0.04, 0.03, 0.04], { sides: 0 });
      }
      k.cyl('#8FA8A0', [0, 0.01, -0.95], 0.3, 0.04, { sides: 3 });
      for (const x of [-0.1, 0.1]) k.ball('#2E2428', [x, 0.08, 0.62], [0.05, 0.04, 0.05], { sides: 0 });
    });
  },
};
