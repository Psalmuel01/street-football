import * as THREE from "three";

export const boneLayout = [
  ["pelvis", "", 0, 0.96, 0],
  ["spine", "pelvis", 0, 0.18, 0],
  ["chest", "spine", 0, 0.27, 0],
  ["neck", "chest", 0, 0.2, 0],
  ["head", "neck", 0, 0.11, 0],
  ["armL", "chest", -0.255, 0.105, 0],
  ["elbowL", "armL", 0, -0.285, 0],
  ["handL", "elbowL", 0, -0.245, 0],
  ["armR", "chest", 0.255, 0.105, 0],
  ["elbowR", "armR", 0, -0.285, 0],
  ["handR", "elbowR", 0, -0.245, 0],
  ["legL", "pelvis", -0.105, -0.005, 0],
  ["kneeL", "legL", 0, -0.44, 0],
  ["footL", "kneeL", 0, -0.425, 0.025],
  ["legR", "pelvis", 0.105, -0.005, 0],
  ["kneeR", "legR", 0, -0.44, 0],
  ["footR", "kneeR", 0, -0.425, 0.025],
] as const;
export type BoneName = (typeof boneLayout)[number][0];
export type FootballerAsset = {
  root: THREE.Group;
  mesh: THREE.SkinnedMesh;
  bones: Record<BoneName, THREE.Bone>;
  materials: THREE.MeshStandardMaterial[];
};
type Ring = [number, number, number, number, number]; // x,y,z,width,depth

/** Original authored ring topology, smooth skin weights, one geometry with material groups. */
export function buildFootballer(detail=true): FootballerAsset {
  const root = new THREE.Group();
  root.name = "LagosFootballer";
  const bones = {} as Record<BoneName, THREE.Bone>;
  const boneArray: THREE.Bone[] = [];
  for (const [name, parent, x, y, z] of boneLayout) {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    bones[name] = b;
    boneArray.push(b);
    if (parent) bones[parent as BoneName].add(b);
    else root.add(b);
  }
  const materials = [
    new THREE.MeshStandardMaterial({
      name: "kit",
      color: "#f4c64b",
      roughness: 0.91,
    }),
    new THREE.MeshStandardMaterial({
      name: "skin",
      color: "#754a33",
      roughness: 0.84,
    }),
    new THREE.MeshStandardMaterial({
      name: "shorts",
      color: "#18272b",
      roughness: 0.96,
    }),
    new THREE.MeshStandardMaterial({
      name: "socks",
      color: "#e5dfcd",
      roughness: 0.95,
    }),
    new THREE.MeshStandardMaterial({
      name: "boots",
      color: "#202725",
      roughness: 0.62,
    }),
    new THREE.MeshStandardMaterial({
      name: "hair",
      color: "#151813",
      roughness: 1,
    }),
    new THREE.MeshStandardMaterial({
      name: "eyes",
      color: "#928879",
      roughness: 0.6,
    }),
  ];
  const positions: number[] = [],
    indices: number[] = [],
    skinIndices: number[] = [],
    weights: number[] = [],
    uvs: number[] = [];
  const geometry = new THREE.BufferGeometry();
  const boneIndex = (name: BoneName) =>
    boneLayout.findIndex((b) => b[0] === name);
  type Weight = (y: number) => [BoneName, BoneName, number];
  const rigid =
    (bone: BoneName): Weight =>
    () => [bone, bone, 0];
  const blend =
    (a: BoneName, b: BoneName, start: number, end: number): Weight =>
    (y) => [a, b, THREE.MathUtils.clamp((y - start) / (end - start), 0, 1)];
  function vertex(
    x: number,
    y: number,
    z: number,
    u: number,
    v: number,
    weight: Weight,
  ) {
    positions.push(x, y, z);
    uvs.push(u, v);
    const [a, b, w] = weight(y);
    skinIndices.push(boneIndex(a), boneIndex(b), 0, 0);
    weights.push(1 - w, w, 0, 0);
  }
  function loft(
    rings: Ring[],
    material: number,
    weight: Weight,
    segments = 32,
  ) {
    const base = positions.length / 3,
      start = indices.length;
    for (let r = 0; r < rings.length; r++) {
      const [x, y, z, rx, rz] = rings[r];
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        const wrinkle =
          material === 0 ? 1 + 0.018 * Math.sin(j * 3 + r * 2) + .006*Math.cos(j*5-r) : material===2 ? 1+.025*Math.sin(j*4+r*2) : 1;
        vertex(
          x + Math.cos(angle) * rx * wrinkle,
          y,
          z + Math.sin(angle) * rz * wrinkle,
          j / segments,
          r / (rings.length - 1),
          weight,
        );
      }
    }
    for (let r = 0; r < rings.length - 1; r++)
      for (let j = 0; j < segments; j++) {
        const a = base + r * (segments + 1) + j,
          b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    geometry.addGroup(start, indices.length - start, material);
  }
  function ellipsoid(
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    material: number,
    bone: BoneName,
    face = false,
  ) {
    const base = positions.length / 3,
      start = indices.length,
      rows = face ? (detail?48:16) : (detail?16:6),
      segments = face ? (detail?64:24) : (detail?24:10);
    for (let r = 0; r <= rows; r++) {
      const latitude = (r / rows) * Math.PI;
      for (let j = 0; j <= segments; j++) {
        const longitude = (j / segments) * Math.PI * 2;
        let px = Math.sin(latitude) * Math.cos(longitude),
          py = Math.cos(latitude),
          pz = Math.sin(latitude) * Math.sin(longitude);
        let xx = px * rx,
          yy = py * ry,
          zz = pz * rz;
        if (face) {
          const front = Math.max(0, pz);
          const jaw = 1 - 0.25 * Math.max(0, -py);
          xx *= jaw;
          zz +=
            front ** 9 *
            (0.037 * Math.exp(-(((yy + 0.012) / 0.032) ** 2)) -
              0.009 * Math.exp(-(((yy - 0.028) / 0.018) ** 2)));
          zz += front ** 4 * 0.012 * Math.exp(-(((yy + 0.085) / 0.03) ** 2));
          // Cheek planes, brow ridge and bilateral eye sockets, sculpted in the head surface.
          const cheek=Math.exp(-Math.pow((Math.abs(xx)-.062)/.025,2)-Math.pow((yy+.018)/.035,2));
          const socket=Math.exp(-Math.pow((Math.abs(xx)-.044)/.021,2)-Math.pow((yy-.018)/.013,2));
          zz += front**3*(.011*cheek-.009*socket);
          zz += front**5*.006*Math.exp(-Math.pow((yy-.046)/.014,2));
        }
        vertex(x + xx, y + yy, z + zz, j / segments, r / rows, rigid(bone));
      }
    }
    for (let r = 0; r < rows; r++)
      for (let j = 0; j < segments; j++) {
        const a = base + r * (segments + 1) + j,
          b = a + segments + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    geometry.addGroup(start, indices.length - start, material);
  }
  // Shirt: tailored waist/chest/shoulder shape, no spherical shoulder pads.
  loft(
    [
      [0, 1.025, 0, 0.216, 0.141],
      [0, 1.065, .001, .211,.137],
      [0, 1.1, 0, 0.205, 0.131],
      [0, 1.16, -.003,.195,.123],
      [0, 1.23, 0, 0.205, 0.135],
      [0, 1.3, .004,.222,.144],
      [0, 1.38, 0.008, 0.238, 0.153],
      [0, 1.43, .006,.245,.15],
      [0, 1.48, 0, 0.248, 0.145],
      [0, 1.535, 0, 0.228, 0.116],
      [0, 1.565, 0, 0.078, 0.071],
    ],
    0,
    blend("spine", "chest", 1.15, 1.47),
    24,
  );
  loft(
    [
      [0, 1.55, 0, 0.07, 0.063],
      [0, 1.65, 0, 0.064, 0.059],
      [0, 1.7, 0, 0.075, 0.07],
    ],
    1,
    rigid("neck"),
  );
  // Pelvis and two separate shorts legs hide the skin seam at the hip.
  loft(
    [
      [0, 0.865, 0, 0.19, 0.125],
      [0, 0.96, 0, 0.204, 0.135],
      [0, 1.06, 0, 0.199, 0.127],
    ],
    2,
    rigid("pelvis"),
  );
  for (const side of [-1, 1]) {
    const suffix = side === -1 ? "L" : "R";
    const arm = `arm${suffix}` as BoneName,
      elbow = `elbow${suffix}` as BoneName,
      hand = `hand${suffix}` as BoneName,
      leg = `leg${suffix}` as BoneName,
      knee = `knee${suffix}` as BoneName,
      foot = `foot${suffix}` as BoneName;
    const x = side * 0.105,
      ax = side * 0.267;
    ellipsoid(ax,1.475,0,.078,.09,.077,0,arm);
    loft(
      [
        [ax, 1.26, 0, 0.062, 0.064],
        [ax, 1.32, 0, 0.075, 0.075],
        [ax, 1.4, 0, 0.082, 0.079],
        [ax, 1.49, 0, 0.083, 0.076],
        [ax, 1.54, 0, 0.035, 0.038],
      ],
      0,
      rigid(arm),
      16,
    );
    loft(
      [
        [ax, 1.035, 0, 0.039, 0.043],
        [ax, 1.13, 0, 0.05, 0.053],
        [ax, 1.2, 0, 0.055, 0.055],
        [ax, 1.25, 0, 0.051, 0.054],
        [ax, 1.3, 0, 0.061, 0.066],
        [ax, 1.34, 0, 0.064, 0.068],
      ],
      1,
      blend(elbow, arm, 1.19, 1.3),
      16,
    );
    ellipsoid(ax, 1.002, 0.005, 0.039, 0.042, 0.023, 1, hand);
    if(detail)for(let finger=0;finger<4;finger++){
      const fx=ax+(finger-1.5)*.018, length=[.044,.053,.05,.038][finger];
      ellipsoid(fx,.97-length*.35,.012,.009,length*.65,.012,1,hand);
      ellipsoid(fx,.97-length*.95,.024,.008,.018,.013,1,hand);
    }else ellipsoid(ax,.964,.009,.036,.035,.024,1,hand);
    ellipsoid(ax - side * 0.034, 0.999, 0.032, 0.017, 0.035, 0.015, 1, hand);
    loft(
      [
        [x, 0.73, 0, 0.105, 0.105],
        [x, 0.82, 0, 0.12, 0.118],
        [x, 0.93, 0, 0.116, 0.121],
        [x, 1.0, 0, 0.095, 0.11],
      ],
      2,
      rigid(leg),
      20,
    );
    loft(
      [
        [x, 0.28, 0, 0.054, 0.058],
        [x, 0.36, 0, 0.069, 0.07],
        [x, 0.43, 0, 0.065, 0.066],
        [x, 0.515, 0.002, 0.063, 0.068],
        [x, 0.58, 0, 0.075, 0.08],
        [x, 0.67, 0, 0.089, 0.095],
        [x, 0.76, 0, 0.094, 0.1],
      ],
      1,
      blend(knee, leg, 0.46, 0.57),
      20,
    );
    loft(
      [
        [x, 0.095, 0.015, 0.048, 0.055],
        [x, 0.16, 0.004, 0.055, 0.061],
        [x, 0.28, 0, 0.062, 0.071],
        [x, 0.38, 0, 0.074, 0.08],
      ],
      3,
      rigid(knee),
      16,
    );
    // Anatomical boot silhouette, outsole, ankle cuff.
    ellipsoid(x, 0.063, 0.09, 0.07, 0.061, 0.143, 4, foot);
    ellipsoid(x, 0.027, 0.097, 0.072, 0.017, 0.14, 3, foot);
    for (let lace = 0; lace < 3; lace++)
      ellipsoid(x, 0.108, 0.08 + lace * 0.022, 0.044, 0.004, 0.004, 3, foot);
    // Ears and understated eye geometry; face surface contains nose, brow and jaw forms.
    ellipsoid(side * 0.108, 1.735, -0.004, 0.018, 0.033, 0.026, 1, "head");
    ellipsoid(side * 0.046, 1.751, 0.103, 0.018, 0.005, 0.006, 6, "head");
    ellipsoid(side * 0.046, 1.751, 0.109, 0.006, 0.005, 0.003, 5, "head");
    ellipsoid(side * 0.046, 1.77, 0.1, 0.028, 0.004, 0.008, 5, "head");
  }
  ellipsoid(0, 1.735, 0, 0.112, 0.145, 0.107, 1, "head", true);
  // Close cropped hair cap. Distinct hairstyles can replace this material group later.
  loft(
    [
      [0, 1.787, 0, 0.111, 0.107],
      [0, 1.823, 0, 0.103, 0.096],
      [0, 1.853, 0, 0.078, 0.074],
      [0,1.865,0,.049,.046],
      [0, 1.87, 0, 0.003, 0.003],
    ],
    5,
    rigid("head"),
    28,
  );
  ellipsoid(0,1.727,.12,.018,.035,.019,1,'head');
  ellipsoid(-.013,1.707,.127,.012,.009,.009,1,'head');
  ellipsoid(.013,1.707,.127,.012,.009,.009,1,'head');
  ellipsoid(0,1.682,.106,.029,.007,.012,1,'head');
  ellipsoid(0,1.677,.108,.026,.002,.01,5,'head');
  ellipsoid(0,1.672,.105,.027,.006,.01,1,'head');
  // Collar trim, shirt seams and boot detailing are modeled and survive offline export.
  loft(
    [
      [0, 1.552, 0, 0.097, 0.087],
      [0, 1.568, 0, 0.09, 0.081],
    ],
    2,
    rigid("chest"),
    20,
  );
  const sortedIndices: number[] = [];
  const groups = geometry.groups.slice();
  geometry.clearGroups();
  for (let material = 0; material < materials.length; material++) {
    const start = sortedIndices.length;
    for (const group of groups)
      if (group.materialIndex === material)
        sortedIndices.push(
          ...indices.slice(group.start, group.start + group.count),
        );
    geometry.addGroup(start, sortedIndices.length - start, material);
  }
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(skinIndices, 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(weights, 4),
  );
  geometry.setIndex(sortedIndices);
  geometry.computeVertexNormals();
  root.updateMatrixWorld(true);
  const mesh = new THREE.SkinnedMesh(geometry, materials);
  mesh.name = "FootballerMesh";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  root.add(mesh);
  mesh.bind(new THREE.Skeleton(boneArray));
  return { root, mesh, bones, materials };
}
