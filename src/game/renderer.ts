import {Neighbourhood} from "./neighbourhood";
import {gameplay} from "./gameplay.config";
import {Atmosphere} from "./atmosphere";
import type {Conditions} from "../content/conditions";
import {PITCH} from "./pitch";
import * as THREE from "three";
import type { MatchFrame } from "./replay";
import {
  createCharacter,
  disposeCharacter,
  animateCharacter,
  type CharacterRig,
} from "./character";
import { StreetLife } from "./street-life";
export class PitchRenderer {
  street: StreetLife;
  atmosphere:Atmosphere;
  sun:THREE.DirectionalLight;
  fill:THREE.DirectionalLight;
  hemi:THREE.HemisphereLight;
  courtMaterial:THREE.MeshStandardMaterial;
  matchView=false;
  onSelect:(id:number)=>void=()=>{};
  spectators:CharacterRig[]=[];
  lastScore=0;
  cheerUntil=0;
  neighbourhood:Neighbourhood;
  wet=false;
  sunset:THREE.CanvasTexture;
  wasReplay=false;
  receiverRing:THREE.Mesh;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(43, 1, 0.1, 250);
  players: THREE.Group[] = [];
  rigs: CharacterRig[] = [];
  ball: THREE.Mesh;
  ring: THREE.Mesh;
  clock = 0;
  cameraMode: "follow" | "broadcast" | "street" = "follow";
  cameraTarget = new THREE.Vector3(0, 0, -1);
  constructor(
    public host: HTMLElement,
    colors: string[],
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor("#d2bda4");
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.append(this.renderer.domElement);
    this.scene.fog = new THREE.Fog("#d2bda4", 65, 150);
    const skyCanvas=document.createElement('canvas');skyCanvas.width=1024;skyCanvas.height=512;
    const skyContext=skyCanvas.getContext('2d')!,gradient=skyContext.createLinearGradient(0,0,0,512);
    gradient.addColorStop(0,'#314e65');gradient.addColorStop(.3,'#889ca5');gradient.addColorStop(.48,'#edbe87');gradient.addColorStop(.56,'#efcf9d');gradient.addColorStop(1,'#7a7965');
    skyContext.fillStyle=gradient;skyContext.fillRect(0,0,1024,512);
    for(let i=0;i<28;i++){skyContext.fillStyle=`rgba(122,102,90,${.025+(i%3)*.015})`;skyContext.beginPath();skyContext.ellipse((i*173)%1024,170+(i*29)%78,60+(i%4)*25,2+(i%4),-.06,0,Math.PI*2);skyContext.fill();}
    this.sunset=new THREE.CanvasTexture(skyCanvas);this.sunset.colorSpace=THREE.SRGBColorSpace;this.sunset.mapping=THREE.EquirectangularReflectionMapping;
    this.scene.background=this.sunset;
    this.camera.position.set(0, 33, 37);
    this.camera.lookAt(0, 0, 0);
    this.hemi=new THREE.HemisphereLight("#aac6d5", "#54422d", 1.15);this.scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight("#ffd29b", 3.8);
    sun.position.set(-32, 13, -24);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, {
      left: -40,
      right: 40,
      top: 35,
      bottom: -35,
    });
    sun.shadow.bias = -0.001;
    this.scene.add(sun);
    const fill = this.fill = new THREE.DirectionalLight('#c4dded',1.15);fill.position.set(10,12,25);this.scene.add(fill);
    this.box(0, -0.5, 0, 120, 0.8, 100, "#adad91");
    this.box(0, -0.05, 0, 60, 0.2, 36, "#c5815e");
    const court = this.box(0, 0.06, 0, 59.5, 0.05, 35.5, "#ffffff");
    this.courtMaterial=court.material as THREE.MeshStandardMaterial;
    this.courtMaterial.map=this.concreteTexture();this.courtMaterial.color.set('#b2c3c3');
    this.courtMaterial.bumpMap=this.courtMaterial.map;this.courtMaterial.bumpScale=.015;
    const line = "#d1d8b8";
    for (const z of [-17.4, 17.4])
      this.box(0, 0.105, z, 58.8, 0.035, 0.11, line);
    for (const x of [-29.4, 29.4, 0])
      this.box(x, 0.105, 0, 0.11, 0.035, 34.8, line);
    this.circle(0, 0, 5.5, line);
    this.circle(0, 0, 0.18, line);
    for (const x of [-25.7, 25.7]) {
      this.box(x, 0.11, -6.3, 7.4, 0.04, 0.11, line);
      this.box(x, 0.11, 6.3, 7.4, 0.04, 0.11, line);
      this.box(x + (x < 0 ? 3.7 : -3.7), 0.11, 0, 0.11, 0.04, 12.6, line);
    }
    for (const x of [-30, 30]) {
      for (const z of [-3.3, 3.3]) {
        this.box(x, 1.25, z, 0.18, 2.5, 0.18, "#f1e7cc");
        this.box(x + Math.sign(x) * 1.4, 1.25, z, 0.1, 2.5, 0.1, "#d7d5bf");
      }
      this.box(x, 2.5, 0, 0.18, 0.18, 6.8, "#f1e7cc");
      for (let z = -3.2; z <= 3.3; z += 0.45)
        this.box(x + Math.sign(x) * 1.4, 1.2, z, 0.035, 2.4, 0.035, "#d5dbca");
      for (let y = 0.2; y < 2.5; y += 0.4)
        this.box(x + Math.sign(x) * 1.4, y, 0, 0.035, 0.035, 6.6, "#d5dbca");
    }
    for (const z of [-19.8, 19.8]) {
      this.box(0, 0.55, z, 65, 1.1, 0.35, "#d2b080");
      for (let x = -32; x <= 32; x += 4) {
        this.box(x, 3, z, 0.09, 5, 0.09, "#5d6455");
      }
      for (let y = 1.4; y <= 5; y += 0.7)
        this.box(0, y, z, 64, 0.025, 0.025, "#858c74");
    }
    for (const x of [-33, 33]) this.box(x, 0.55, 0, 0.35, 1.1, 40, "#d2b080");
    const buildingColors = [
      "#d59b6a",
      "#78aca8",
      "#d1a253",
      "#ba7c70",
      "#8c9fab",
    ];
    const plaster = this.plasterTexture();
    for (let i = 0; i < 9; i++) {
      const x = -36 + i * 9,
        h = 5 + ((i * 7) % 5) * 1.6;
      const facade = this.box(x, h / 2, -41, 8, h, 9, buildingColors[i % 5]);
      (facade.material as THREE.MeshStandardMaterial).map = plaster;
      this.box(x, h + 0.2, -41, 8.6, 0.4, 9.6, "#626b5a");
      for (let y = 2; y < h; y += 2.7)
        for (let xx = -2; xx <= 2; xx += 4) {
          this.box(x + xx, y, -36.45, 1.4, 1.5, 0.12, "#3d5955");
          this.box(x + xx, y - 0.8, -36.3, 1.7, 0.12, 0.35, "#e0cda6");
        }
    }
    for (let i = 0; i < 9; i++) {
      const x = -36 + i * 9,
        h = 5 + ((i * 7) % 5) * 1.6;
      this.box(x + 2.6, h - 1.7, -36.05, 1, 0.65, 0.55, "#c7c4b1");
      for (let j = 0; j < 4; j++)
        this.box(
          x + 2.6,
          h - 1.9 + j * 0.11,
          -35.76,
          0.8,
          0.025,
          0.02,
          "#6c7168",
        );
      this.box(x, 1.5, -36.35, 2.7, 2.7, 0.15, "#59695e");
      for (let j = 0; j < 9; j++)
        this.box(x, 0.35 + j * 0.28, -36.23, 2.65, 0.045, 0.04, "#889083");
      if (i % 2 === 0) {
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(0.85, 0.85, 1.4, 16),
          new THREE.MeshStandardMaterial({ color: "#343a34", roughness: 0.8 }),
        );
        tank.position.set(x + 1, h + 1, -41);
        tank.castShadow = true;
        this.scene.add(tank);
      }
      const awning = this.box(
        x,
        3.1,
        -35.8,
        3.3,
        0.12,
        1.4,
        i % 2 ? "#b37448" : "#82947b",
      );
      awning.rotation.x = 0.17;
    }
    this.sign(
      "BOLA’S CORNER STORE",
      -9,
      3.8,
      -36.1,
      5,
      0.65,
      "#dab354",
      "#304938",
    );
    this.sign(
      "COLD DRINKS • GOOD VIBES",
      9,
      3.8,
      -36.1,
      5,
      0.65,
      "#d6c7a2",
      "#4b6252",
    );
    for (const z of [-35.7, -36.4]) {
      const points = [];
      for (let j = 0; j <= 40; j++)
        points.push(
          new THREE.Vector3(
            -32 + j * 1.6,
            10 - Math.sin((j / 40) * Math.PI) * 2,
            z,
          ),
        );
      this.scene.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: "#454b43" }),
        ),
      );
    }
    this.sign(
      "SURULERE • EVERYBODY GET GAME",
      0,
      3.2,
      -22.3,
      19,
      2.3,
      "#e2b638",
      "#253e31",
    );
    this.sign("NO DULLING", -16, 1.5, 19.45, 10, 1.8, "#e7dcc0", "#344c40");
    this.sign(
      "LAGOS STREET FOOTBALL",
      12,
      1.5,
      19.45,
      13,
      1.8,
      "#233e33",
      "#e9d49e",
    );
    this.neighbourhood=new Neighbourhood(this.scene);
    this.street = new StreetLife(this.scene);
    this.atmosphere=new Atmosphere(this.scene);
    for (let i = 0; i < 40; i++) {
      const x = -31 + ((i * 9.13) % 62),
        z = i % 2 ? -21.2 : 21.3;
      const rig = createCharacter(
        i % 3 === 0 ? "#d2a13b" : i % 3 === 1 ? "#bf6a4a" : "#648d92",
        i,
        false,
      );
      const g=rig.root;g.scale.multiplyScalar(.96);g.rotation.y=i%2===0?Math.PI:0;
      g.position.set(x, 0, z);
      if(i%10===0){g.position.set([-25,-6,17,29][i/10],0,-21.8);g.rotation.y=0;}
      this.spectators.push(rig);this.scene.add(g);
    }
    for (const x of [-37,37]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.17,.32,10,9),new THREE.MeshStandardMaterial({color:'#77634a',roughness:1}));
      trunk.position.set(x,5,9);trunk.castShadow=true;this.scene.add(trunk);
      for(let i=0;i<11;i++) {
        const angle=i*Math.PI*2/11, vertices:number[]=[];
        for(let j=0;j<=10;j++) {
          const t=j/10,r=t*4.8,width=Math.sin(t*Math.PI)*.48;
          for(const side of [-1,1])vertices.push(x+Math.cos(angle)*r+Math.sin(angle)*width*side,10+Math.sin(t*Math.PI)*.65-t*t*1.9,9+Math.sin(angle)*r-Math.cos(angle)*width*side);
        }
        const indices:number[]=[];for(let j=0;j<10;j++){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
        const leaf=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:i%2?'#596e40':'#72874b',side:THREE.DoubleSide,roughness:1}));leaf.castShadow=true;this.scene.add(leaf);
      }
    }
    for (let i = 0; i < 10; i++) {
      const rig = createCharacter(
        i % 5 === 0 ? "#d66b49" : colors[i < 5 ? 0 : 1],
        i,
      );
      this.rigs.push(rig);
      const g = rig.root;
      g.scale.multiplyScalar(1.12);
      this.players.push(g);
      this.scene.add(g);
    }
    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 32, 24),
      new THREE.MeshStandardMaterial({ color: "#fff9dd", map:this.ballTexture(),roughness:.65 }),
    );
    this.ball.castShadow = true;
    this.scene.add(this.ball);
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.75, 48),
      new THREE.MeshBasicMaterial({ color: "#fff4a0", side: THREE.DoubleSide }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.scene.add(this.ring);
    this.receiverRing=new THREE.Mesh(new THREE.RingGeometry(.62,.68,36),new THREE.MeshBasicMaterial({color:'#85dfff',side:THREE.DoubleSide,transparent:true,opacity:.8}));this.receiverRing.rotation.x=-Math.PI/2;this.scene.add(this.receiverRing);
    this.renderer.domElement.addEventListener('click',e=>{
      if(!this.matchView)return;
      const bounds=this.renderer.domElement.getBoundingClientRect();let nearest=-1,distance=36;
      for(let i=0;i<5;i++){const point=this.players[i].position.clone();point.y=1;point.project(this.camera);const d=Math.hypot((point.x*.5+.5)*bounds.width-(e.clientX-bounds.left),(-point.y*.5+.5)*bounds.height-(e.clientY-bounds.top));if(point.z<1&&d<distance){distance=d;nearest=i;}}
      if(nearest>=0)this.onSelect(nearest);
    });
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
  }
  setQuality(level:string){
    const quality=level==='auto'?(matchMedia('(pointer:coarse)').matches?'medium':'high'):level;
    this.renderer.setPixelRatio(quality==='low'?1:Math.min(devicePixelRatio,quality==='medium'?1.3:1.8));
    this.renderer.shadowMap.enabled=quality!=='low';
    const size=quality==='high'?2048:1024;
    if(this.sun.shadow.mapSize.x!==size){this.sun.shadow.mapSize.set(size,size);this.sun.shadow.map?.dispose();this.sun.shadow.map=null;}
    this.spectators.forEach((rig,i)=>{rig.root.visible=quality==='high'||i%(quality==='low'?2:4)!==0;});
    this.resize();
  }
  setConditions(condition:Conditions){
    this.scene.background=condition==='golden'?this.sunset:new THREE.Color(condition==='night'?'#172c39':'#95adae');this.wet=condition==='rain';this.atmosphere.set(condition);const night=condition==='night',rain=condition==='rain';
    this.sun.intensity=night?.18:rain?1.4:3.8;this.hemi.intensity=night?.8:rain?1.2:1.15;this.fill.intensity=night?.8:1.15;
    const sky=night?'#172c39':rain?'#95adae':'#d99d64';this.renderer.setClearColor(sky);(this.scene.fog as THREE.Fog).color.set(sky);
    this.courtMaterial.roughness=rain?.58:.95;this.courtMaterial.metalness=0;this.courtMaterial.color.set(rain?'#869a91':'#b2c3c3');
    const label=document.querySelector('.court-top>span');if(label)label.textContent=`SURULERE / LAGOS · ${night?'UNDER THE LIGHTS':rain?'AFTER THE RAIN':'GOLDEN HOUR'}`;
  }
  setPlayerAppearance(id:number,color:string,identity:number,number:number){
    this.scene.remove(this.players[id]);
    disposeCharacter(this.rigs[id]);
    const rig=createCharacter(color,identity,true,number);rig.root.scale.multiplyScalar(1.12);this.rigs[id]=rig;this.players[id]=rig.root;this.scene.add(rig.root);
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
  ) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.95 }),
    );
    m.position.set(x, y, z);
    m.castShadow = h > 0.3;
    m.receiveShadow = true;
    this.scene.add(m);
    return m;
  }
  circle(x: number, z: number, r: number, color: string) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(0, r - 0.07), r, 64),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.12, z);
    this.scene.add(m);
  }
  person(color: string, scale: number, index = 0) {
    const rig = createCharacter(color, index, false);
    rig.root.scale.multiplyScalar(scale);
    rig.arms.forEach((arm, i) => {
      arm.rotation.x = -0.3;
      rig.elbows[i].rotation.x = -0.45;
    });
    rig.root.rotation.y = index % 2 === 0 ? Math.PI : 0;
    return rig.root;
  }
  ballTexture(){
    const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#eeeadc';ctx.fillRect(0,0,512,256);
    for(let row=0;row<4;row++)for(let col=0;col<8;col++){const x=col*64+(row%2)*32,y=row*64+32;ctx.beginPath();for(let k=0;k<6;k++){const a=k*Math.PI/3;ctx.lineTo(x+31*Math.cos(a),y+31*Math.sin(a));}ctx.closePath();ctx.fillStyle=(row+col)%3===0?'#27372e':'#e9e6db';ctx.fill();ctx.strokeStyle='#aaa99b';ctx.lineWidth=1.5;ctx.stroke();}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  plasterTexture() {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const c=canvas.getContext('2d')!;c.fillStyle='#e1ddd0';c.fillRect(0,0,256,256);
    let seed=32;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<9000;i++){c.fillStyle=random()>.5?'#ffffff14':'#362c2514';c.fillRect(random()*256,random()*256,1+random()*3,1+random()*2);}
    for(let i=0;i<65;i++){const x=random()*256,y=random()*256;c.fillStyle='#574b3520';c.fillRect(x,y,random()*5,8+random()*45);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }
  concreteTexture() {
    const texture = new THREE.TextureLoader().load('/assets/art/court-concrete-v1.jpg');
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8,5);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  sign(
    text: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    bg: string,
    fg: string,
  ) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = fg;
    ctx.font = "bold 46px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, 512, 80);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: new THREE.CanvasTexture(c),
        side: THREE.DoubleSide,
      }),
    );
    m.position.set(x, y, z);
    if (z > 0) m.rotation.y = Math.PI;
    this.scene.add(m);
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1.2 ? 58 : 43;
    this.camera.updateProjectionMatrix();
  }
  draw(match: MatchFrame, dt: number, replay=false) {
    this.clock = match.presentationTime;
    this.neighbourhood.update(dt,match.players,match.state==='PAUSED'||match.state==='FULL_TIME',this.wet);
    this.street.update(dt, match.state === "PAUSED" || match.state === "FULL_TIME");
    this.atmosphere.update(dt,match.state==='PAUSED'||match.state==='FULL_TIME');
    const total=match.score[0]+match.score[1];
    if(total>this.lastScore)this.cheerUntil=this.street.time+3;this.lastScore=total;
    this.spectators.forEach((rig,i)=>{if(!rig.root.visible)return;const cheering=this.street.time<this.cheerUntil && (i%4!==0);animateCharacter(rig,this.street.time,0,i,false,cheering?{kind:'celebrate',elapsed:(this.street.time+i*.13)%2.5,duration:2.5,side:1,contacted:true}:null);if(!cheering){rig.head.rotation.y+=Math.sin(this.street.time*.4+i)*.18;
      if(i%10===0){rig.hips.position.y=.55;rig.legs.forEach(b=>b.rotation.x=-1.42);rig.knees.forEach(b=>b.rotation.x=1.42);rig.elbows.forEach(b=>b.rotation.x=-.9);}
      else if(i%5===0){rig.bones.spine.rotation.x=.15;rig.elbows.forEach(b=>b.rotation.x=-1.1);}
      else if(i%7===0){rig.arms[1].rotation.x=-.9;rig.elbows[1].rotation.x=-1.65;rig.head.rotation.x=.16;}
    }});
    match.players.forEach((p, i) => {
      const g = this.players[i];
      g.position.set(p.x, 0, p.y);
      const target = Math.atan2(p.facingX, p.facingY);
      const frozen = match.state === "PAUSED" || match.state === "FULL_TIME";
      const striking = p.action?.kind === "pass" || p.action?.kind === "shot";
      if(replay)g.rotation.y=target;
      g.rotation.y +=
        Math.atan2(
          Math.sin(target - g.rotation.y),
          Math.cos(target - g.rotation.y),
        ) * (frozen ? 0 : 1 - Math.exp(-dt * (striking ? 45 : 12)));
      if (!frozen && striking && p.action!.contacted) g.rotation.y = target;
      animateCharacter(
        this.rigs[i],
        this.clock,
        Math.hypot(p.vx, p.vy),
        i * 0.8,
        p.keeper,
        p.action,
        p.stride,
        {receive:p.receiveTime,recovery:p.recovery,vx:p.vx,vy:p.vy,facingX:p.facingX,facingY:p.facingY},
      );
    });
    this.ball.position.set(match.ball.x, 0.235 + match.ball.z, match.ball.y);
    const animationDt =
      match.state === "PAUSED" || match.state === "FULL_TIME" ? 0 : dt;
    this.ball.rotation.x += match.ball.vy * animationDt;
    this.ball.rotation.z -= match.ball.vx * animationDt;
    const p = match.players[match.active];
    this.ring.position.set(p.x, 0.14, p.y);
    const targetReceiver=match.passFlight ? match.players[match.passFlight.receiver] : null;
    this.receiverRing.visible=!!targetReceiver&&!replay;if(targetReceiver)this.receiverRing.position.set(targetReceiver.x,.15,targetReceiver.y);
    const close = this.matchView && this.cameraMode !== 'broadcast';
    const lookAhead=THREE.MathUtils.clamp(match.ball.vx*gameplay.camera.lookAhead,-3,3);
    const focusX=close?THREE.MathUtils.clamp(match.ball.x+lookAhead,-30,30):match.ball.x*.2;
    const focusZ=close?THREE.MathUtils.clamp(match.ball.y,-16,16):0;
    const blend=1-Math.exp(-dt*(replay?5:3.8));
    const portrait=this.camera.aspect<1;
    const height=replay?2.8:close?(portrait?13.5:this.cameraMode==='street'?gameplay.camera.streetHeight:gameplay.camera.followHeight):gameplay.camera.wideHeight;
    const depth=replay?7.5:close?(portrait?17:this.cameraMode==='street'?gameplay.camera.streetDepth:gameplay.camera.followDepth):gameplay.camera.wideDepth;
    const desiredCamera=new THREE.Vector3(focusX+(replay?3:0),height,depth+focusZ);
    if(replay&&(!this.wasReplay||Math.abs(this.cameraTarget.x-focusX)>12)){
      this.camera.position.copy(desiredCamera);this.cameraTarget.set(focusX,1,focusZ-1);
    }else this.camera.position.lerp(desiredCamera,blend);
    this.wasReplay=replay;
    this.cameraTarget.lerp(new THREE.Vector3(focusX,1.0,focusZ-1),blend);
    this.camera.lookAt(this.cameraTarget);
    const radar=document.querySelector<HTMLCanvasElement>('#radar');
    if(radar&&this.matchView){const c=radar.getContext('2d')!;c.clearRect(0,0,180,112);c.fillStyle='#10281cbb';c.fillRect(0,0,180,112);c.strokeStyle='#d8edb555';c.lineWidth=1;c.strokeRect(8,5,164,102);c.beginPath();c.moveTo(90,5);c.lineTo(90,107);c.stroke();c.beginPath();c.arc(90,56,16,0,Math.PI*2);c.stroke();for(const q of match.players){c.fillStyle=q.team===0?'#ddf47e':'#76cbe0';c.beginPath();c.arc(90+q.x/PITCH.halfLength*82,56+q.y/PITCH.halfWidth*51,q.id===match.active?3.5:2.2,0,Math.PI*2);c.fill();}c.fillStyle='#fff';c.beginPath();c.arc(90+match.ball.x/PITCH.halfLength*82,56+match.ball.y/PITCH.halfWidth*51,2.5,0,Math.PI*2);c.fill();}
    this.renderer.render(this.scene, this.camera);
  }
}
