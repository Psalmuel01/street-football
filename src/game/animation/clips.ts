import * as THREE from "three";
import { boneLayout, type BoneName } from "../assets/footballer";
import { actionTiming } from "./actions";
export const clipNames = [
  "idle",
  "walk",
  "run",
  "sprint",
  "pass",
  "shot",
  "tackle",
  "slide",
  "stumble",
  "skill",
  "keeper",
  "catch",
  "diveLeft",
  "diveRight",
  "celebrate",
] as const;
export type ClipName = (typeof clipNames)[number];
type Pose = {
  rot: Record<BoneName, [number, number, number]>;
  position: [number, number, number];
};
function curve(t: number, keys: number[][]) {
  for (let i = 1; i < keys.length; i++)
    if (t <= keys[i][0]) {
      const a = keys[i - 1],
        b = keys[i],
        f = THREE.MathUtils.clamp((t - a[0]) / (b[0] - a[0]), 0, 1),
        s = f * f * (3 - 2 * f);
      return a[1] + (b[1] - a[1]) * s;
    }
  return keys[keys.length - 1][1];
}
function base(): Pose {
  const rot = {} as Pose["rot"];
  for (const [name] of boneLayout) rot[name] = [0, 0, 0];
  rot.armL = [0.04, 0, -0.09];
  rot.armR = [0.04, 0, 0.09];
  rot.elbowL = rot.elbowR = [-0.12, 0, 0];
  return { rot, position: [0, 0.96, 0] };
}
export function samplePose(name: ClipName, t: number): Pose {
  const p = base(),
    r = p.rot;
  if (name === "idle") {
    r.chest[0] = Math.sin(t * Math.PI) * 0.012;
    r.head[1] = Math.sin(t * Math.PI * 0.5) * 0.04;
    return p;
  }
  if (name === "walk" || name === "run" || name === "sprint") {
    const walking = name === "walk", fast = name === "sprint",
      phase = (t / (walking ? 1.0 : fast ? 0.48 : 0.64)) * Math.PI * 2;
    const amp = walking ? .3 : fast ? 0.86 : 0.62;
    p.position[1] -= (walking ? .006 : .01) + Math.abs(Math.sin(phase)) * (walking ? .006 : .012);
    r.spine[0] = fast ? 0.1 : 0.055;
    for (const [i, s] of ["L", "R"].entries()) {
      const wave = Math.sin(phase + i * Math.PI);
      r[`leg${s}` as BoneName][0] = -wave * amp;
      r[`knee${s}` as BoneName][0] = (walking ? .08 : .18) + Math.max(0, -wave) * (walking ? .45 : 1.15);
      r[`foot${s}` as BoneName][0] = Math.max(0, wave) * 0.2;
      r[`arm${s}` as BoneName][0] = wave * (walking ? .2 : fast ? 0.7 : 0.45);
      r[`elbow${s}` as BoneName][0] = walking ? -.2 : fast ? -1 : -0.7;
    }
    return p;
  }
  if (name === "pass" || name === "shot") {
    const contact = actionTiming[name].contact,
      duration = actionTiming[name].duration;
    const power = name === "shot";
    const a = curve(t, [
      [0, 0.22],
      [contact * 0.48, 0.48],
      [contact, -0.72],
      [contact + 0.1, power ? -1.05 : -0.82],
      [duration, 0],
    ]);
    r.legR[0] = a;
    r.kneeR[0] = curve(t, [
      [0, 0.6],
      [contact * 0.5, 0.9],
      [contact, 0.2],
      [contact + 0.12, 0.38],
      [duration, 0],
    ]);
    r.footR[0] = -0.05;
    r.legL[0] = -0.1;
    r.kneeL[0] = 0.2;
    r.footL[0] = -0.1;
    r.spine[0] = power ? 0.14 : 0.06;
    r.chest[1] = curve(t, [
      [0, -0.2],
      [contact, 0.1],
      [duration, 0],
    ]);
    r.armL = [-0.18, 0, -0.4];
    r.armR = [0.3, 0, 0.27];
    r.elbowL = [-0.5, 0, 0];
    r.elbowR = [-0.35, 0, 0];
    p.position[0] = -0.025;
    p.position[1] -= 0.007;
    if (!power) r.legR[1] = 0.26;
    return p;
  }
  if (name === "tackle") {
    const progress = curve(t, [
      [0, 0],
      [0.13, 1],
      [0.3, 1],
      [0.62, 0],
    ]);
    p.position[1] -= 0.2 * progress;
    r.spine[0] = 0.42 * progress;
    r.legR[0] = -0.97 * progress;
    r.kneeR[0] = 0.2 * progress;
    r.legL[0] = -0.5 * progress;
    r.kneeL[0] = 1.25 * progress;
    r.footL[0] = -0.75 * progress;
    r.armL[2] = -0.55 * progress;
    r.armR[2] = 0.55 * progress;
    return p;
  }
  if (name === 'slide') {
    const down = curve(t, [[0, 0], [.16, 1], [.48, 1], [.8, .8], [1.05, .3], [1.25, 0]]);
    p.position[1] -= .58 * down;
    r.spine[0] = -.22 * down; r.chest[1] = -.08 * down;
    r.legR[0] = -1.3 * down; r.kneeR[0] = .15 * down; r.footR[0] = .2 * down;
    r.legL[0] = -1.8 * down; r.legL[2] = -.15 * down; r.kneeL[0] = 2.2 * down; r.footL[0] = -.6 * down;
    r.armL = [.3 * down, 0, -.65 * down]; r.armR = [.25 * down, 0, .7 * down];
    r.elbowL[0] = r.elbowR[0] = -.5 * down;
    return p;
  }
  if (name === 'stumble') {
    const a = curve(t, [[0, 0], [.16, 1], [.32, .85], [.75, 0]]);
    p.position[1] -= .12 * a; r.spine[0] = .35 * a; r.legL[0] = -.25 * a; r.kneeL[0] = .5 * a; r.legR[0] = .15 * a; r.kneeR[0] = .3 * a;
    r.armL[2] = -.55 * a; r.armR[2] = .55 * a; r.elbowL[0] = r.elbowR[0] = -.65 * a;
    return p;
  }
  if (name === "skill") {
    const phase = (t / 0.55) * Math.PI * 2;
    r.legR[0] = -0.4 * Math.sin(phase);
    r.legR[2] = 0.28 * Math.sin(phase);
    r.kneeR[0] = Math.max(0, Math.sin(phase)) * 0.55;
    r.chest[1] = Math.sin(phase) * 0.25;
    r.armL[2] = -0.3;
    r.armR[2] = 0.3;
    return p;
  }
  if (name === "keeper" || name === "catch") {
    p.position[1] -= 0.065;
    r.legL[0] = r.legR[0] = -0.3;
    r.kneeL[0] = r.kneeR[0] = 0.6;
    r.footL[0] = r.footR[0] = -0.3;
    r.spine[0] = 0.16;
    r.armL = [-0.3, 0, -0.25];
    r.armR = [-0.3, 0, 0.25];
    r.elbowL = r.elbowR = [-0.7, 0, 0];
    if (name === "catch") {
      const reach = curve(t, [
        [0, 1],
        [0.16, 0.7],
        [0.4, 0.4],
        [0.65, 0.4],
      ]);
      r.armL = [-0.7 - reach * 0.45, -0.25, -0.12];
      r.armR = [-0.7 - reach * 0.45, 0.25, 0.12];
      r.elbowL = r.elbowR = [-0.55, 0, 0];
    }
    return p;
  }
  if (name === "diveLeft" || name === "diveRight") {
    const side = name === "diveLeft" ? -1 : 1,
      a = curve(t, [
        [0, 0],
        [0.22, 1],
        [0.48, 1],
        [0.95, 0],
      ]);
    p.position[0] = side * 0.47 * a;
    p.position[1] -= 0.5 * a;
    r.pelvis[2] = -side * 0.92 * a;
    r.spine[0] = 0.12;
    r.armL = [-0.35 * a, 0, -2.6 * a];
    r.armR = [-0.35 * a, 0, 2.9 * a];
    r.elbowL = r.elbowR = [-0.15, 0, 0];
    r.legL[0] = -0.25 * a;
    r.kneeL[0] = 0.35 * a;
    r.legR[0] = 0.3 * a;
    r.kneeR[0] = 0.6 * a;
    return p;
  }
  if (name === "celebrate") {
    const a = Math.min(1, t / 0.25);
    r.armL = [-0.2, 0, -2.4 * a];
    r.armR = [-0.2, 0, 2.4 * a];
    r.elbowL = r.elbowR = [-0.4 * a, 0, 0];
    p.position[1] += Math.max(0, Math.sin(t * 6)) * 0.07;
    r.chest[1] = Math.sin(t * 3) * 0.1;
    return p;
  }
  return p;
}
export function buildClips() {
  return clipNames.map((name) => {
    const duration =
      name === "idle"
        ? 4
        : name === "walk" ? 1.0 : name === "run"
          ? 0.64
          : name === "sprint"
            ? 0.48
            : name === "keeper"
              ? 2
              : name === "diveLeft" || name === "diveRight"
                ? 0.95
                : actionTiming[name as keyof typeof actionTiming].duration;
    const frames = Math.ceil(duration * 60),
      times = Array.from(
        { length: frames + 1 },
        (_, i) => (i / frames) * duration,
      );
    const poses = times.map((t) => samplePose(name, t));
    const tracks: THREE.KeyframeTrack[] = [];
    for (const [bone] of boneLayout) {
      const values = poses.flatMap((p) => {
        const [x, y, z] = p.rot[bone];
        return new THREE.Quaternion()
          .setFromEuler(new THREE.Euler(x, y, z))
          .toArray();
      });
      tracks.push(
        new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times, values),
      );
    }
    tracks.push(
      new THREE.VectorKeyframeTrack(
        "pelvis.position",
        times,
        poses.flatMap((p) => p.position),
      ),
    );
    return new THREE.AnimationClip(name, duration, tracks);
  });
}
