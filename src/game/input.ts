import { idle, type Input } from "./simulation";
export class InputManager {
  keys = new Set<string>();
  pressed = new Set<string>();
  touch = idle();
  heldTouch = new Set<string>();
  lastButtons: boolean[] = [];
  device = "Keyboard";
  constructor(public pause: () => void) {
    window.addEventListener("keydown", (e) => {
      if(e.target instanceof HTMLElement){
        if(e.target.closest('dialog[open]'))return;
        if(e.code==='Space'&&e.target.closest('button,a')&&!document.body.classList.contains('in-match'))return;
      }
      if (
        e.target instanceof HTMLElement &&
        e.target.matches("input,select,textarea")
      )
        return;
      if (
        ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
          e.code,
        )
      )
        e.preventDefault();
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (e.code === "Escape" && !e.repeat) pause();
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.pressed.clear();
      this.touch = idle();
      this.heldTouch.clear();
    });
  }
  read(): Input {
    const k = this.keys,
      p = this.pressed;
    let i: Input = {
      x:
        Number(k.has("KeyD") || k.has("ArrowRight")) -
        Number(k.has("KeyA") || k.has("ArrowLeft")),
      y:
        Number(k.has("KeyS") || k.has("ArrowDown")) -
        Number(k.has("KeyW") || k.has("ArrowUp")),
      sprint: k.has("ShiftLeft") || k.has("ShiftRight"),
      pass: p.has("Space"),
      shoot: p.has("KeyJ"),
      through: p.has("KeyK"),
      tackle: p.has("KeyL"),
      switch: p.has("KeyQ"),
      skill: p.has("KeyE"),
      contain:k.has("Space"),secondPress:k.has("KeyJ"),keeperRush:k.has("KeyK"),
      passAndMove:k.has("KeyQ")&&p.has("Space"),
    };
    p.clear();
    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      this.device = "Gamepad";
      const edge = (n: number) =>
        pad.buttons[n]?.pressed && !this.lastButtons[n];
      if (Math.abs(pad.axes[0]) > 0.16) i.x = pad.axes[0];
      if (Math.abs(pad.axes[1]) > 0.16) i.y = pad.axes[1];
      i.pass ||= edge(0);
      i.shoot ||= edge(2);
      i.through ||= edge(3);
      i.tackle ||= edge(1);
      i.switch ||= edge(4);
      i.skill ||= edge(7);
      i.contain ||= pad.buttons[0]?.pressed;
      i.secondPress ||= pad.buttons[2]?.pressed;
      i.keeperRush ||= pad.buttons[3]?.pressed;
      i.passAndMove ||= pad.buttons[4]?.pressed&&edge(0);
      i.sprint ||= pad.buttons[5]?.pressed;
      i.sprint ||= pad.buttons[6]?.pressed;
      if (edge(9)) this.pause();
      this.lastButtons = pad.buttons.map((b) => b.pressed);
    } else this.device = "Keyboard";
    if (this.touch.x || this.touch.y) {
      i.x = this.touch.x;
      i.y = this.touch.y;
    }
    for (const key of [
      "sprint",
      "pass",
      "shoot",
      "through",
      "tackle",
      "switch",
      "skill",
    ] as const)
      i[key] ||= this.touch[key];
    for (const key of [
      "pass",
      "shoot",
      "through",
      "tackle",
      "switch",
      "skill",
    ] as const)
      this.touch[key] = false;
    i.contain ||= this.heldTouch.has("pass");
    i.secondPress ||= this.heldTouch.has("shoot");
    i.keeperRush ||= this.heldTouch.has("through");
    i.passAndMove ||= this.heldTouch.has("switch")&&i.pass;
    return i;
  }
  bindTouch() {
    const stick = document.querySelector<HTMLElement>("#joystick")!;
    let pointer: number | null = null;
    const move = (e: PointerEvent) => {
      const r = stick.getBoundingClientRect();
      let x = (e.clientX - r.left - r.width / 2) / 38,
        y = (e.clientY - r.top - r.height / 2) / 38;
      const d = Math.max(1, Math.hypot(x, y));
      this.touch.x = x / d;
      this.touch.y = y / d;
      stick.style.setProperty("--jx", `${(x / d) * 30}px`);
      stick.style.setProperty("--jy", `${(y / d) * 30}px`);
    };
    stick.onpointerdown = (e) => {
      pointer = e.pointerId;
      stick.setPointerCapture(pointer);
      move(e);
    };
    stick.onpointermove = (e) => {
      if (e.pointerId === pointer) move(e);
    };
    const stop = () => {
      pointer = null;
      this.touch.x = this.touch.y = 0;
      stick.style.setProperty("--jx", "0px");
      stick.style.setProperty("--jy", "0px");
    };
    stick.onpointerup = stop;
    stick.onpointercancel = stop;
    document.querySelectorAll<HTMLElement>("[data-action]").forEach((b) => {
      const action = b.dataset.action as keyof Input;
      b.onpointerdown = (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        this.heldTouch.add(action);
        if (action !== "x" && action !== "y") this.touch[action] = true;
      };
      b.onpointerup = b.onpointercancel = () => {
        this.heldTouch.delete(action);
        if (action === "sprint") this.touch.sprint = false;
      };
    });
  }
}
