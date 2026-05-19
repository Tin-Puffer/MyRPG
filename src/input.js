export class Input {
  constructor(canvas, doc) {
    this.canvas = canvas;
    this.doc = doc;
    this.keysDown = new Set();
    this.pressed = new Set();
    this.pointer = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      down: false,
      clicked: false,
      inside: false,
    };

    this.bind();
  }

  bind() {
    this.doc.addEventListener("keydown", (event) => {
      if (event.code === "Tab") {
        event.preventDefault();
      }
      if (!event.repeat) {
        this.pressed.add(event.code);
      }
      this.keysDown.add(event.code);
    });

    this.doc.addEventListener("keyup", (event) => {
      this.keysDown.delete(event.code);
    });

    this.doc.addEventListener("visibilitychange", () => {
      if (this.doc.hidden) {
        this.keysDown.clear();
        this.pressed.clear();
        this.pointer.down = false;
      }
    });

    this.canvas.addEventListener("mousemove", (event) => {
      this.updatePointer(event);
      this.pointer.inside = true;
    });

    this.canvas.addEventListener("mouseenter", (event) => {
      this.updatePointer(event);
      this.pointer.inside = true;
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.pointer.inside = false;
    });

    // Mouse still tracks position but does NOT trigger attacks anymore
    this.canvas.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      this.updatePointer(event);
      this.pointer.down = true;
    });

    window.addEventListener("mouseup", (event) => {
      if (event.button === 0) {
        this.pointer.down = false;
      }
    });

    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  updatePointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.pointer.x = (event.clientX - rect.left) * scaleX;
    this.pointer.y = (event.clientY - rect.top) * scaleY;
  }

  isDown(code) {
    return this.keysDown.has(code);
  }

  consumePressed(code) {
    const has = this.pressed.has(code);
    if (has) this.pressed.delete(code);
    return has;
  }

  consumeAttack() {
    // Attack only with J key or Space (J is the main melee key)
    return this.consumePressed("KeyJ") || this.consumePressed("Space");
  }

  consumeInteract() {
    return this.consumePressed("KeyE");
  }

  consumeQuickSlot(index) {
    return this.consumePressed(`Digit${index + 1}`);
  }

  consumeSkill(code) {
    return this.consumePressed(code);
  }

  endFrame() {
    this.pressed.clear();
    this.pointer.clicked = false;
  }
}