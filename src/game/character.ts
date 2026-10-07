import * as THREE from "three";
import { detailedMaterial } from "./materials";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { buildFootballer, type BoneName } from "./assets/footballer";
import { buildClips, type ClipName } from "./animation/clips";
import { actionWeight, type PlayerAction } from "./animation/actions";

let template: THREE.Group | null = null;
let crowdTemplate:THREE.Group|null=null;
let clips = buildClips();
export async function prepareCharacterAsset() {
  try {
    const gltf = await new GLTFLoader().loadAsync(
      "/assets/characters/lagos-footballer.glb",
    );
    template = gltf.scene;
    clips = gltf.animations;
  } catch {
    template = buildFootballer().root;
    console.info("Using original local character source; GLB not available.");
  }
}
export type CharacterRig = {
  root: THREE.Group;
  hips: THREE.Bone;
  head: THREE.Bone;
  arms: THREE.Bone[];
  legs: THREE.Bone[];
  knees: THREE.Bone[];
  elbows: THREE.Bone[];
  bones: Record<BoneName, THREE.Bone>;
  kit: THREE.MeshStandardMaterial;
  mixer: THREE.AnimationMixer;
  actions: Map<ClipName, THREE.AnimationAction>;
};
const skinTones = ["#573525", "#754a33", "#493122", "#976344", "#65402d"];
export function createCharacter(
  color: string,
  index = 0,
  detail = true,
  jerseyNumber = (index % 5) + 7,
  goalkeeper = jerseyNumber===1||jerseyNumber===20,
): CharacterRig {
  template ??= buildFootballer().root;
  if(!detail)crowdTemplate??=buildFootballer(false).root;
  const root = clone(detail?template:crowdTemplate!) as THREE.Group,
    bones = {} as CharacterRig["bones"];
  let kit!: THREE.MeshStandardMaterial;
  root.traverse((node) => {
    if (node instanceof THREE.Bone) bones[node.name as BoneName] = node;
    if (node instanceof THREE.SkinnedMesh) {
      node.frustumCulled = false;
      node.castShadow = true;
      node.receiveShadow = true;
      const firstMaterial = Array.isArray(node.material)
        ? node.material[0]
        : node.material;
      if (firstMaterial.name === "hair" && index % 3 !== 0) {
        node.geometry = node.geometry.clone();
        node.userData.ownedGeometry=true;
        const pos = node.geometry.attributes.position;
        for (let v = 0; v < pos.count; v++) {
          const y = pos.getY(v);
          if (y > 1.785) {
            const extra =
              index % 3 === 1
                ? 0.024 +
                  0.008 *
                    Math.sin(pos.getX(v) * 210) *
                    Math.cos(pos.getZ(v) * 180)
                : 0.012;
            pos.setY(v, y + extra * Math.min(1, (y - 1.785) / 0.04));
          }
        }
        node.geometry.computeVertexNormals();
      }
      const source = Array.isArray(node.material)
        ? node.material
        : [node.material];
      const result = (source as THREE.MeshStandardMaterial[]).map(
        (material) => {
          const m = material.clone();
          detailedMaterial(m);
          if (m.name === "kit") {
            m.color.set(color);
            kit = m;
          }
          if(!detail&&m.name==='socks')m.color.set(skinTones[index%skinTones.length]);
          if (m.name === "skin")
            m.color.set(skinTones[index % skinTones.length]);
          return m;
        },
      );
      node.material = Array.isArray(node.material) ? result : result[0];
    }
  });
  if(detail){
    // Instanced short twists keep the silhouette irregular without one draw per curl.
    const hairMaterial=new THREE.MeshStandardMaterial({color:index%4===2?'#251e18':'#141512',roughness:.98});
    const count=index%3===0?54:32;
    const curls=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,1),hairMaterial,count);
    const transform=new THREE.Object3D();
    for(let n=0;n<count;n++){
      const theta=n*2.39996,r=Math.sqrt((n+.5)/count)*.106;
      transform.position.set(Math.cos(theta)*r,.078+Math.sqrt(Math.max(0,1-r*r/.012))*.066,Math.sin(theta)*r);
      transform.scale.set(.018,.019+(index%3===0?.022:.008)*(1-r/.12),.017);
      transform.rotation.set(n*.7,n*.9,n*.2);transform.updateMatrix();curls.setMatrixAt(n,transform.matrix);
    }
    curls.castShadow=true;bones.head.add(curls);
  }
  // Original number + chest crest on the deforming shirt's chest bone.
  if (detail) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f3ecd5";
    ctx.textAlign = "center";
    ctx.font = "600 64px sans-serif";
    ctx.fillText(String(jerseyNumber), 64, 84);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({
      map,
      transparent: true,
      depthWrite: false,
      roughness: 0.9,
    });
    material.userData.ownedTexture=true;
    const front = new THREE.Mesh(
      new THREE.PlaneGeometry(0.145, 0.145),
      material,
    );
    front.position.set(0, -0.04, 0.163);
    bones.chest.add(front);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), material);
    back.position.set(0, -0.06, -0.148);
    back.rotation.y = Math.PI;
    bones.chest.add(back);
    const crest = new THREE.Mesh(
      new THREE.PlaneGeometry(0.044, 0.055),
      new THREE.MeshStandardMaterial({ color: "#e8dfbe", roughness: 0.9 }),
    );
    crest.position.set(-0.11, 0.075, 0.134);
    bones.chest.add(crest);
  }
  if (detail && goalkeeper) {
    const gloves = new THREE.MeshStandardMaterial({
      color: "#d9d6b7",
      roughness: 0.92,
    });
    for (const hand of [bones.handL, bones.handR]) {
      const glove = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), gloves);
      glove.scale.set(0.052, 0.078, 0.04);
      glove.position.y = -0.002;
      glove.castShadow = true;
      hand.add(glove);
    }
  }
  // Height and build variation are cosmetic only; collision/statistics are unchanged.
  root.scale.set([.93,1.05,.99,1.08,.95][index%5], [.98,1.025,1.0,.96,1.03][index%5], [.95,1.04,.98,1.05,.96][index%5]);
  const mixer = new THREE.AnimationMixer(root);
  const actions = new Map<ClipName, THREE.AnimationAction>();
  for (const clip of clips) {
    const action = mixer.clipAction(clip);
    action.play();
    action.setEffectiveWeight(0);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    actions.set(clip.name as ClipName, action);
  }
  return {
    root,
    bones,
    hips: bones.pelvis,
    head: bones.head,
    arms: [bones.armL, bones.armR],
    legs: [bones.legL, bones.legR],
    knees: [bones.kneeL, bones.kneeR],
    elbows: [bones.elbowL, bones.elbowR],
    kit,
    mixer,
    actions,
  };
}
export function disposeCharacter(rig:CharacterRig){
  rig.mixer.stopAllAction();rig.mixer.uncacheRoot(rig.root);
  const materials=new Set<THREE.Material>();const textures=new Set<THREE.Texture>();
  rig.root.traverse(node=>{if(node instanceof THREE.Mesh){if(node instanceof THREE.InstancedMesh)node.dispose();if(!(node instanceof THREE.SkinnedMesh)||node.userData.ownedGeometry)node.geometry.dispose();for(const m of Array.isArray(node.material)?node.material:[node.material]){materials.add(m);if(m.userData.ownedTexture&&(m as THREE.MeshStandardMaterial).map)textures.add((m as THREE.MeshStandardMaterial).map!);}}});
  materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
/** Bone evaluation is driven by simulation time, so pause and frame-rate changes cannot release a ball. */
export function animateCharacter(
  rig: CharacterRig,
  time: number,
  speed: number,
  phase: number,
  keeper = false,
  action: PlayerAction | null = null,
  stride?: number,
  motion?:{receive:number;recovery:number;vx:number;vy:number;facingX:number;facingY:number},
) {
  for (const clip of rig.actions.values()) {
    clip.enabled = true;
    clip.paused = false;
    clip.setEffectiveWeight(0);
  }
  const set = (name: ClipName, weight: number, t: number) => {
    const clip = rig.actions.get(name)!;
    clip.time = THREE.MathUtils.clamp(t, 0, clip.getClip().duration - 0.000001);
    clip.setEffectiveWeight(weight);
  };
  const running = Math.min(1, speed / 1.0),
    jogging=THREE.MathUtils.clamp((speed-1.8)/2.2,0,1),
    fast = THREE.MathUtils.clamp((speed - 6) / 2, 0, 1);
  const weight = action ? actionWeight(action) : 0;
  set(
    keeper ? "keeper" : "idle",
    (1 - running) * (1 - weight),
    time % (keeper ? 2 : 4),
  );
  const cycle = stride ?? time * (speed > 7 ? 2.1 : 1.6) + phase;
  set("walk",running*(1-jogging)*(1-weight),cycle%1);
  set("run", running * jogging * (1 - fast) * (1 - weight), (cycle % 1) * 0.64);
  set("sprint", running * fast * (1 - weight), (cycle % 1) * 0.48);
  if (action) {
    const name: ClipName =
      action.kind === "dive"
        ? action.side < 0
          ? "diveLeft"
          : "diveRight"
        : action.kind;
    set(name, weight, action.elapsed);
  }
  rig.mixer.update(0);
  if(motion&&!action){
    const lateral=motion.vx*motion.facingY-motion.vy*motion.facingX;
    const forward=motion.vx*motion.facingX+motion.vy*motion.facingY;
    rig.bones.spine.rotation.z-=THREE.MathUtils.clamp(lateral*.045,-.23,.23);
    rig.bones.spine.rotation.x+=THREE.MathUtils.clamp(forward*.009,-.10,.08);
    rig.bones.chest.rotation.y+=THREE.MathUtils.clamp(lateral*.025,-.15,.15);
    if(motion.recovery>0){rig.bones.spine.rotation.x+=.23;rig.arms[0].rotation.z-=.35;rig.arms[1].rotation.z+=.35;}
    if(motion.receive>0){const weight=motion.receive/.18;rig.legs[1].rotation.x-=.35*weight;rig.legs[1].rotation.y+=.3*weight;rig.knees[1].rotation.x+=.35*weight;rig.arms[0].rotation.z-=.2*weight;}
  }
  // Two-bone foot placement during locomotion: a level sole on each stance, lifted on recovery.
  if (!action && speed > 0.4 && !motion?.receive) {
    for (let i = 0; i < 2; i++) {
      const f = (cycle + i * 0.5) % 1,
        stance = 0.42;
      const length = Math.min(0.82, 0.24 + speed * 0.075);
      let z: number, y: number;
      if (f < stance) {
        z = length * (0.5 - f / stance);
        y = 0.09;
      } else {
        const swing = (f - stance) / (1 - stance);
        z = length * (-0.5 + swing);
        y = 0.09 + Math.sin(swing * Math.PI) * Math.min(.19,.06+speed*.017);
      }
      const dy = y - (rig.hips.position.y - 0.005),
        d = Math.min(0.864, Math.hypot(dy, z));
      const upper = 0.44,
        lower = 0.425;
      const thigh =
        -Math.atan2(z, -dy) -
        Math.acos(
          THREE.MathUtils.clamp(
            (upper * upper + d * d - lower * lower) / (2 * upper * d),
            -1,
            1,
          ),
        );
      const knee =
        Math.PI -
        Math.acos(
          THREE.MathUtils.clamp(
            (upper * upper + lower * lower - d * d) / (2 * upper * lower),
            -1,
            1,
          ),
        );
      rig.legs[i].rotation.x = thigh;
      rig.knees[i].rotation.x = knee;
      rig.bones[i === 0 ? "footL" : "footR"].rotation.x = -thigh - knee;
    }
  }
}

export class SquadPreview {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
  rigs: CharacterRig[] = [];
  motion: "idle" | "run" | "shot" | "tackle" | "catch" = "idle";
  motionStart = 0;
  constructor(host: HTMLElement, color: string) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor("#1a2824", 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight("#e9f2ff", "#4d4738", 2));
    const key = new THREE.DirectionalLight("#ffdfac", 3);
    key.position.set(-3, 5, 5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight("#b0ded3", 3);
    rim.position.set(3, 3, -3);
    this.scene.add(rim);
    this.camera.position.set(0, 1.25, 4.75);
    this.camera.lookAt(0, 1.02, 0);
    for (let i = 0; i < 3; i++) {
      const rig = createCharacter(color, i + 1);
      rig.root.position.set((i - 1) * 0.7, 0, i === 1 ? 0.25 : 0);
      rig.root.rotation.y = (i - 1) * -0.2;
      this.rigs.push(rig);
      this.scene.add(rig.root);
    }
    new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return;
      this.renderer.setSize(host.clientWidth, host.clientHeight);
      this.camera.aspect = host.clientWidth / host.clientHeight;
      this.camera.updateProjectionMatrix();
    }).observe(host);
  }
  setColor(color: string) {
    this.rigs.forEach((r) => r.kit.color.set(color));
  }
  setMotion(motion: typeof this.motion, time: number) {
    this.motion = motion;
    this.motionStart = time;
  }
  draw(time: number) {
    const elapsed = time - this.motionStart;
    this.rigs.forEach((r, i) => {
      const duration =
        this.motion === "shot" ? 0.58 : this.motion === "tackle" ? 0.62 : 0.65;
      const t = elapsed % 1.8;
      const action =
        this.motion === "idle" || this.motion === "run" || t > duration
          ? null
          : ({
              kind: this.motion,
              elapsed: t,
              duration,
              side: 1,
              contacted: t > 0.12,
            } as PlayerAction);
      animateCharacter(
        r,
        time,
        this.motion === "run" ? 5.5 : 0,
        i,
        false,
        action,
      );
    });
    this.renderer.render(this.scene, this.camera);
  }
}
