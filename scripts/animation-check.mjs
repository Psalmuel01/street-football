import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5173/#/setup");
  await page.locator('[data-motion="run"]').click();
  assert.equal(
    await page.locator('[data-motion="run"]').getAttribute("aria-pressed"),
    "true",
  );
  await page.evaluate(()=>location.hash="/clubs");
  await page.locator('[data-team="1"]').click();
  await page.evaluate(()=>location.hash="/setup");
  assert.equal(await page.locator("#squad-name").innerText(), "YABA BOYS");
  const diagnostics = await page.evaluate(async () => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { prepareCharacterAsset, createCharacter, animateCharacter } =
      await import("/src/game/character.ts");
    const { actionTiming } = await import("/src/game/animation/actions.ts");
    await prepareCharacterAsset();
    const rig = createCharacter("#efbd46", 1);
    const clips = [...rig.actions.keys()];
    const weights = [];
    let vertices = 0;
    rig.root.traverse((n) => {
      if (n.isSkinnedMesh) {
        vertices += n.geometry.attributes.position.count;
        const w = n.geometry.attributes.skinWeight;
        for (let i = 0; i < w.count; i++)
          weights.push(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i));
      }
    });
    animateCharacter(rig, 0, 0, 0, false, {
      kind: "shot",
      elapsed: actionTiming.shot.contact,
      duration: 0.58,
      side: 1,
      contacted: true,
    });
    rig.root.updateMatrixWorld(true);
    const contact = rig.bones.footR.localToWorld(
      new THREE.Vector3(0, -0.027, 0.09),
    );
    const ball = new THREE.Vector3(0.1, 0.22, 0.64);
    const contactDistance = contact.distanceTo(ball);
    const before = rig.bones.kneeR.quaternion.toArray();
    animateCharacter(rig, 0, 0, 0, false, {
      kind: "shot",
      elapsed: actionTiming.shot.contact,
      duration: 0.58,
      side: 1,
      contacted: true,
    });
    const frozen = before.every(
      (n, i) => Math.abs(n - rig.bones.kneeR.quaternion.toArray()[i]) < 1e-8,
    );
    let finite = true;
    for (const kind of ["pass", "shot", "tackle", "slide", "stumble", "catch", "dive", "celebrate"])
      for (let i = 0; i <= 20; i++) {
        animateCharacter(rig, i / 20, 0, 0, false, {
          kind,
          elapsed: (i / 20) * actionTiming[kind].duration,
          duration: actionTiming[kind].duration,
          side: 1,
          contacted: true,
        });
        rig.root.updateMatrixWorld(true);
        rig.root.traverse((n) => {
          if (n.isSkinnedMesh) {
            const point = new THREE.Vector3();
            for (let v = 0; v < n.geometry.attributes.position.count; v += 23) {
              n.getVertexPosition(v, point);
              if (![point.x, point.y, point.z].every(Number.isFinite))
                finite = false;
            }
          }
        });
      }
    const { PitchRenderer } = await import("/src/game/renderer.ts");
    const { Match, idle } = await import("/src/game/simulation.ts");
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:-1000px;width:500px;height:320px";
    document.body.append(host);
    const pitch = new PitchRenderer(host, ["#efbd46", "#50b6a7"]);
    const match = new Match();
    match.state = "PLAYING";
    match.owner = 3;
    pitch.players[3].rotation.y = -Math.PI / 2;
    match.shoot(match.players[3]);
    for (let i = 0; i < 7; i++) {
      match.step(1 / 60, idle());
      pitch.draw(match, 1 / 60);
    }
    const heading = Math.atan2(
      match.players[3].facingX,
      match.players[3].facingY,
    );
    const aligned = Math.abs(pitch.players[3].rotation.y - heading) < 1e-6;
    match.pause();
    const headingBefore = pitch.players[3].rotation.y;
    pitch.draw(match, 1 / 30);
    const headingFrozen = pitch.players[3].rotation.y === headingBefore;
    pitch.renderer.dispose();
    host.remove();
    // Render deterministic poses side-by-side, using the actual shipped GLB and clips.
    document.querySelector("#app").style.display="none";
    document.body.insertAdjacentHTML("beforeend",'<div id="pose-sheet"><h1>CHARACTER & MOTION STUDY</h1><p>Lagos Street Football · original skinned mesh · in-game animation clips</p><div id="poses"></div></div>');
    document.head.insertAdjacentHTML(
      "beforeend",
      "<style>body{margin:0;background:#e4e3d8;color:#273b32}#pose-sheet{padding:40px}#pose-sheet h1{font:700 36px sans-serif;letter-spacing:1px}#pose-sheet p{font:14px sans-serif}#poses{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-top:25px}.pose{background:#ced0c0;position:relative;height:330px}.pose canvas{position:absolute;inset:0}.pose b{position:absolute;z-index:2;left:16px;bottom:14px;font:12px sans-serif;letter-spacing:1px}</style>",
    );
    const cases = [
      ["STAND", null, 0],
      ["RUN", null, 5],
      ["SLIDE CONTACT",{kind:"slide",elapsed:.2,duration:1.25,side:1,contacted:true},0],
      ["SLIDE RECOVERY",{kind:"slide",elapsed:.85,duration:1.25,side:1,contacted:true},0],
      [
        "PASS",
        {
          kind: "pass",
          elapsed: 0.085,
          duration: 0.42,
          side: 1,
          contacted: true,
        },
        0,
      ],
      [
        "SHOT",
        {
          kind: "shot",
          elapsed: 0.1167,
          duration: 0.58,
          side: 1,
          contacted: true,
        },
        0,
      ],
      [
        "TACKLE",
        {
          kind: "tackle",
          elapsed: 0.15,
          duration: 0.62,
          side: 1,
          contacted: true,
        },
        0,
      ],
      [
        "CATCH",
        {
          kind: "catch",
          elapsed: 0.12,
          duration: 0.65,
          side: 1,
          contacted: true,
        },
        0,
      ],
      [
        "DIVE",
        {
          kind: "dive",
          elapsed: 0.25,
          duration: 0.95,
          side: 1,
          contacted: true,
        },
        0,
      ],
      [
        "CELEBRATE",
        {
          kind: "celebrate",
          elapsed: 0.5,
          duration: 2.5,
          side: 1,
          contacted: true,
        },
        0,
      ],
    ];
    cases.forEach(([label, action, speed], i) => {
      const host = document.createElement("div");
      host.className = "pose";
      host.innerHTML = `<b>${label}</b>`;
      document.querySelector("#poses").append(host);
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.setPixelRatio(1);
      renderer.setClearColor("#ced0c0");
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      host.append(renderer.domElement);
      const scene = new THREE.Scene();
      scene.add(new THREE.HemisphereLight("#eaf1ed", "#77644d", 2));
      const light = new THREE.DirectionalLight("#ffe4b9", 3);
      light.position.set(-2, 4, 3);
      scene.add(light);
      const r = createCharacter(i % 2 ? "#50b6a7" : "#efbd46", i % 5);
      scene.add(r.root);
      animateCharacter(r, 0.17, speed, 0, false, action, 0.24);
      const camera = new THREE.PerspectiveCamera(
        34,
        host.clientWidth / host.clientHeight,
        0.1,
        20,
      );
      camera.position.set(2.1, 1.5, 3.5);
      camera.lookAt(0, 1, 0);
      if (label.startsWith("SLIDE")) {camera.position.set(2.5,1.2,4.1);camera.lookAt(0,.75,.3);}
      if (label === "DIVE") {
        camera.position.set(2.4, 1.5, 4.1);
        camera.lookAt(0.3, 0.85, 0);
      }
      if (label === "SHOT" || label === "PASS") {
        const ball = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.11, 2),
          new THREE.MeshStandardMaterial({ color: "#eee9d0" }),
        );
        ball.position.set(0.1, 0.22, 0.64);
        scene.add(ball);
      }
      renderer.render(scene, camera);
    });
    return {
      clips,
      aligned,
      headingFrozen,
      contactDistance,
      frozen,
      finite,
      weightsValid: weights.every((w) => Math.abs(w - 1) < 1e-6),
      vertices,
    };
  });
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({
    path: "artifacts/character-motion-study.png",
    fullPage: true,
  });
  console.log(diagnostics);
  assert.ok(
    diagnostics.contactDistance < 0.22,
    "Kicking foot misses contact point",
  );
  assert.ok(diagnostics.frozen);
  assert.ok(diagnostics.aligned, "Strike heading must align by contact");
  assert.ok(diagnostics.headingFrozen, "Pause must freeze actor heading");
  assert.ok(diagnostics.finite);
  assert.ok(diagnostics.weightsValid);
  assert.equal(diagnostics.clips.length, 15);
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
