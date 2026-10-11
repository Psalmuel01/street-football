import * as THREE from 'three';
import type { CharacterRig } from '../character';
const soleHeight = .09;
/** Solve in rig space so cosmetic nonuniform body scale cannot shear the IK result. Preserve captured swing poses. Only grounded stance legs receive a small two-bone correction. */
export function capturedFootContacts(rig: CharacterRig, speed: number) {
  const plants=rig.footPlants!;
  const position = (bone: THREE.Object3D) => rig.root.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
  const orientation = (bone: THREE.Object3D) => {
    const result = new THREE.Quaternion();
    let node: THREE.Object3D | null = bone;
    while (node && node !== rig.root) { result.premultiply(node.quaternion); node = node.parent; }
    return result;
  };
  for(let i=0;i<2;i++) {
    const thigh=rig.legs[i],knee=rig.knees[i],foot=rig.bones[i?'footR':'footL'];
    rig.root.updateMatrixWorld(true);
    const worldEnd=foot.getWorldPosition(new THREE.Vector3());
    const start=position(thigh),bend=position(knee),end=position(foot);
    const contact=worldEnd.y < (soleHeight+.025)*rig.root.scale.y;
    if(!contact){plants.points[i]=null;plants.stance[i]=false;continue;}
    if(!plants.points[i])plants.points[i]=worldEnd.clone();
    const target=rig.root.worldToLocal(plants.points[i]!.clone());
    // Large cuts release the contact rather than dragging a boot or twisting the planted leg.
    if(target.distanceTo(end)>.2){plants.points[i]=null;plants.stance[i]=false;continue;}
    plants.stance[i]=true;
    const upper=start.distanceTo(bend),lower=bend.distanceTo(end),delta=target.clone().sub(start),distance=Math.min(delta.length(),upper+lower-.001);
    if(distance<.001)continue;
    if(delta.length() > upper+lower-.001){plants.points[i]=null;plants.stance[i]=false;continue;}
    const axis=delta.normalize();
    const plane=bend.clone().sub(start);plane.addScaledVector(axis,-plane.dot(axis));
    if(plane.lengthSq()<1e-8){plants.points[i]=null;plants.stance[i]=false;continue;}
    plane.normalize();
    const along=(upper*upper+distance*distance-lower*lower)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
    const desiredKnee=start.clone().addScaledVector(axis,along).addScaledVector(plane,height);
    const footWorld=orientation(foot);
    const thighWorld=orientation(thigh);
    const turn=new THREE.Quaternion().setFromUnitVectors(bend.clone().sub(start).normalize(),desiredKnee.clone().sub(start).normalize());
    const parentWorld=orientation(thigh.parent!);
    thigh.quaternion.copy(parentWorld.invert().multiply(turn.multiply(thighWorld)));
    rig.root.updateMatrixWorld(true);
    const actualKnee=position(knee),actualFoot=position(foot);
    const kneeWorld=orientation(knee);
    const kneeTurn=new THREE.Quaternion().setFromUnitVectors(actualFoot.sub(actualKnee).normalize(),target.clone().sub(actualKnee).normalize());
    knee.quaternion.copy(orientation(thigh).invert().multiply(kneeTurn.multiply(kneeWorld)));
    rig.root.updateMatrixWorld(true);
    foot.quaternion.copy(orientation(knee).invert().multiply(footWorld));
  }
}
