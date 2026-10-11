import * as THREE from 'three';
import { boneLayout } from '../assets/footballer';
import { clipNames, type ClipName } from './clips';
import { actionTiming } from './actions';

export type MotionProvenance = { rigVersion: number; source: string; license: string; author: string; reviewed: boolean };
/** Accept a coherent, reviewed, offline-retargeted pack. Legacy procedural exports stay explicit fallbacks. */
export function validateMotionPack(clips: THREE.AnimationClip[], provenance?: MotionProvenance): string[] {
  const errors: string[] = [];
  if (!provenance || provenance.rigVersion !== 1 || !provenance.source || !provenance.license || !provenance.author || !provenance.reviewed) {
    return ['Missing reviewed motion provenance for stable rig version 1'];
  }
  for (const name of clipNames) {
    const matches = clips.filter(clip => clip.name === name);
    if (matches.length !== 1) { errors.push(`${name}: expected one clip`); continue; }
    const clip = matches[0];
    if (!Number.isFinite(clip.duration) || clip.duration <= 0) errors.push(`${name}: invalid duration`);
    const timing = actionTiming[name as keyof typeof actionTiming];
    if (timing && Math.abs(clip.duration - timing.duration) > .001) errors.push(`${name}: duration must preserve simulation contact timing`);
    for (const [bone] of boneLayout) {
      if (!clip.tracks.some(t => t.name === `${bone}.quaternion`)) errors.push(`${name}: missing ${bone} rotation`);
    }
    if (!clip.tracks.some(t => t.name === 'pelvis.position')) errors.push(`${name}: missing pelvis position`);
    for (const track of clip.tracks) {
      if (!boneLayout.some(([bone]) => track.name === `${bone}.quaternion`) && track.name !== 'pelvis.position') errors.push(`${name}: unsupported transform ${track.name}`);
      if (!track.times.length || Array.from(track.times).some((t, i, times) => !Number.isFinite(t) || t < 0 || (i > 0 && t <= times[i - 1]))) errors.push(`${name}: invalid sample times`);
      if (Array.from(track.values).some(v => !Number.isFinite(v))) errors.push(`${name}: nonfinite transform`);
      if (track instanceof THREE.QuaternionKeyframeTrack) {
        for (let i = 0; i < track.values.length; i += 4) {
          if (Math.abs(Math.hypot(...Array.from(track.values.slice(i, i + 4))) - 1) > .01) { errors.push(`${name}: nonunit quaternion`); break; }
        }
      }
    }
  }
  return errors;
}
export function selectMotionPack(embedded: THREE.AnimationClip[], fallback: THREE.AnimationClip[], provenance?: MotionProvenance) {
  const errors = validateMotionPack(embedded, provenance);
  return { clips: errors.length ? fallback : clipNames.map(name => embedded.find(clip => clip.name === name)!), source: errors.length ? 'procedural-prototype' : 'reviewed-embedded', errors };
}
export const clipDuration = (actions: Map<ClipName, THREE.AnimationAction>, name: ClipName) => actions.get(name)!.getClip().duration;
