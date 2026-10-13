import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Batch only static direct children. Animated groups, skinned meshes and textured signs stay separate. */
export function batchStatic(group:THREE.Object3D){
 const batches=new Map<string,THREE.Mesh[]>();
 for(const child of group.children){if(!(child instanceof THREE.Mesh)||child instanceof THREE.SkinnedMesh||child instanceof THREE.InstancedMesh||Array.isArray(child.material)||!(child.material instanceof THREE.MeshStandardMaterial)||child.material.map)continue;const m=child.material,key=[m.color.getHex(),m.roughness,m.metalness,m.emissive.getHex(),m.emissiveIntensity,m.side,m.transparent,m.opacity,m.depthWrite,m.alphaTest,child.castShadow,child.receiveShadow,Object.keys(child.geometry.attributes).sort().join(','),!!child.geometry.index].join('|');const batch=batches.get(key)??[];batch.push(child);batches.set(key,batch);}
 for(const meshes of batches.values()){if(meshes.length<2)continue;const transformed=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});const geometry=mergeGeometries(transformed);transformed.forEach(g=>g.dispose());if(!geometry)continue;const result=new THREE.Mesh(geometry,meshes[0].material);result.castShadow=meshes[0].castShadow;result.receiveShadow=meshes[0].receiveShadow;group.add(result);for(const [i,mesh] of meshes.entries()){group.remove(mesh);mesh.geometry.dispose();if(i>0)(mesh.material as THREE.Material).dispose();}}
}
