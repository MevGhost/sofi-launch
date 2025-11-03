import easingUtils from "https://esm.sh/easing-utils";

class AHole extends HTMLElement {
  /**
   * Init
   */
  connectedCallback() {
    // Elements
    this.canvas = this.querySelector(".js-canvas");
    this.ctx = this.canvas.getContext("2d");

    this.discs = [];
    this.lines = [];

    // Init
    this.setSize();
    this.setDiscs();
    this.setLines();
    this.setParticles();

    this.bindEvents();

    // RAF
    requestAnimationFrame(this.tick.bind(this));
  }

  /**
   * Bind events
   */
  bindEvents() {
    window.addEventListener("resize", this.onResize.bind(this));
  }

  /**
   * Resize handler
   */
  onResize() {
    this.setSize();
    this.setDiscs();
    this.setLines();
    this.setParticles();
  }

  /**
   * Set size
   */
  setSize() {
    this.rect = this.getBoundingClientRect();

    this.render = {
      width: this.rect.width,
      height: this.rect.height,
      dpi: window.devicePixelRatio
    };

    this.canvas.width = this.render.width * this.render.dpi;
    this.canvas.height = this.render.height * this.render.dpi;
  }

  /**
   * Set discs
   */
  setDiscs() {
    const { width, height } = this.rect;

    this.discs = [];

    this.startDisc = {
      x: width * 0.5,
      y: height * 0.45,
      w: width * 0.75,
      h: height * 0.7
    };

    this.endDisc = {
      x: width * 0.5,
      y: height * 0.95,
      w: 0,
      h: 0
    };

    const totalDiscs = 100;

    let prevBottom = height;
    this.clip = {};

    for (let i = 0; i < totalDiscs; i++) {
      const p = i / totalDiscs;

      const disc = this.tweenDisc({
        p
      });

      const bottom = disc.y + disc.h;

      if (bottom <= prevBottom) {
        this.clip = {
          disc: { ...disc },
          i
        };
      }

      prevBottom = bottom;

      this.discs.push(disc);
    }

    this.clip.path = new Path2D();
    this.clip.path.ellipse(
      this.clip.disc.x,
      this.clip.disc.y,
      this.clip.disc.w,
      this.clip.disc.h,
      0,
      0,
      Math.PI * 2
    );
    this.clip.path.rect(
      this.clip.disc.x - this.clip.disc.w,
      0,
      this.clip.disc.w * 2,
      this.clip.disc.y
    );
  }

  /**
   * Set lines
   */
  setLines() {
    const { width, height } = this.rect;

    this.lines = [];

    const totalLines = 100;
    const linesAngle = (Math.PI * 2) / totalLines;

    for (let i = 0; i < totalLines; i++) {
      this.lines.push([]);
    }

    this.discs.forEach((disc) => {
      for (let i = 0; i < totalLines; i++) {
        const angle = i * linesAngle;

        const p = {
          x: disc.x + Math.cos(angle) * disc.w,
          y: disc.y + Math.sin(angle) * disc.h
        };

        this.lines[i].push(p);
      }
    });

    this.linesCanvas = new OffscreenCanvas(width, height);
    const ctx = this.linesCanvas.getContext("2d");

    this.lines.forEach((line, i) => {
      ctx.save();

      let lineIsIn = false;
      line.forEach((p1, j) => {
        if (j === 0) {
          return;
        }

        const p0 = line[j - 1];

        if (
          !lineIsIn &&
          (ctx.isPointInPath(this.clip.path, p1.x, p1.y) ||
            ctx.isPointInStroke(this.clip.path, p1.x, p1.y))
        ) {
          lineIsIn = true;
        } else if (lineIsIn) {
          ctx.clip(this.clip.path);
        }

        ctx.beginPath();

        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);

        ctx.strokeStyle = "#9945FF";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.closePath();
      });

      ctx.restore();
    });

    this.linesCtx = ctx;
  }

  /**
   * Set particles
   */
  setParticles() {
    const { width, height } = this.rect;

    this.particles = [];

    this.particleArea = {
      sw: this.clip.disc.w * 0.5,
      ew: this.clip.disc.w * 2,
      h: height * 0.85
    };
    this.particleArea.sx = (width - this.particleArea.sw) / 2;
    this.particleArea.ex = (width - this.particleArea.ew) / 2;

    const totalParticles = 100;

    for (let i = 0; i < totalParticles; i++) {
      const particle = this.initParticle(true);

      this.particles.push(particle);
    }
  }

  /**
   * Init particle
   */
  initParticle(start = false) {
    const sx = this.particleArea.sx + this.particleArea.sw * Math.random();
    const ex = this.particleArea.ex + this.particleArea.ew * Math.random();
    const dx = ex - sx;
    const vx = 0.1 + Math.random() * 0.5;
    const y = start ? this.particleArea.h * Math.random() : this.particleArea.h;
    const r = 0.5 + Math.random() * 4;
    const vy = 0.5 + Math.random();

    return {
      x: sx,
      sx,
      dx,
      y,
      vy,
      p: 0,
      r,
      c: `rgba(0, 212, 255, ${0.3 + Math.random() * 0.7})`
    };
  }

  /**
   * Tween value
   */
  tweenValue(start, end, p, ease = false) {
    const delta = end - start;

    const easeFn =
      easingUtils[
        ease ? "ease" + ease.charAt(0).toUpperCase() + ease.slice(1) : "linear"
      ];

    return start + delta * easeFn(p);
  }

  /**
   * Draw discs
   */
  drawDiscs() {
    const { ctx } = this;

    ctx.strokeStyle = "#00D4FF";
    ctx.lineWidth = 2;

    // Outer disc
    const outerDisc = this.startDisc;

    ctx.beginPath();

    ctx.ellipse(
      outerDisc.x,
      outerDisc.y,
      outerDisc.w,
      outerDisc.h,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    ctx.closePath();

    // Discs
    this.discs.forEach((disc, i) => {
      if (i % 5 !== 0) {
        return;
      }

      if (disc.w < this.clip.disc.w - 5) {
        ctx.save();

        ctx.clip(this.clip.path);
      }

      ctx.beginPath();

      ctx.ellipse(disc.x, disc.y, disc.w, disc.h, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.closePath();

      if (disc.w < this.clip.disc.w - 5) {
        ctx.restore();
      }
    });
  }

  /**
   * Draw lines
   */
  drawLines() {
    const { ctx, linesCanvas } = this;

    ctx.drawImage(linesCanvas, 0, 0);
  }

  /**
   * Draw particles
   */
  drawParticles() {
    const { ctx } = this;

    ctx.save();

    ctx.clip(this.clip.path);

    this.particles.forEach((particle) => {
      ctx.fillStyle = particle.c;
      ctx.beginPath();
      ctx.rect(particle.x, particle.y, particle.r, particle.r);
      ctx.closePath();

      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Move discs
   */
  moveDiscs() {
    this.discs.forEach((disc) => {
      disc.p = (disc.p + 0.001) % 1;

      this.tweenDisc(disc);
    });
  }

  /**
   * Move Particles
   */
  moveParticles() {
    this.particles.forEach((particle) => {
      particle.p = 1 - particle.y / this.particleArea.h;
      particle.x = particle.sx + particle.dx * particle.p;
      particle.y -= particle.vy;

      if (particle.y < 0) {
        particle.y = this.initParticle().y;
      }
    });
  }

  /**
   * Tween disc
   */
  tweenDisc(disc) {
    disc.x = this.tweenValue(this.startDisc.x, this.endDisc.x, disc.p);
    disc.y = this.tweenValue(
      this.startDisc.y,
      this.endDisc.y,
      disc.p,
      "inExpo"
    );

    disc.w = this.tweenValue(this.startDisc.w, this.endDisc.w, disc.p);
    disc.h = this.tweenValue(this.startDisc.h, this.endDisc.h, disc.p);

    return disc;
  }

  /**
   * Tick
   */
  tick(time) {
    const { ctx } = this;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.scale(this.render.dpi, this.render.dpi);

    this.moveDiscs();
    this.moveParticles();

    this.drawDiscs();
    this.drawLines();
    this.drawParticles();

    ctx.restore();

    requestAnimationFrame(this.tick.bind(this));
  }
}

class Particle {
  constructor(x, y, ctx) {}

  move() {}

  draw() {}
}

customElements.define("a-hole", AHole);

// Sophisticated Mouse Tracking for Feature Cards
class MouseTracker {
  constructor() {
    this.featureCards = document.querySelectorAll('[data-tilt]');
    this.init();
  }

  init() {
    this.featureCards.forEach(card => {
      card.addEventListener('mousemove', this.handleMouseMove.bind(this));
      card.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
      card.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
    });
  }

  handleMouseMove(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    
    // Calculate mouse position relative to card center
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation values (max 15 degrees)
    const rotateX = (y - centerY) / centerY * -15;
    const rotateY = (x - centerX) / centerX * 15;
    
    // Calculate translate values for subtle movement
    const translateX = (x - centerX) / centerX * 5;
    const translateY = (y - centerY) / centerY * 5;
    
    // Apply sophisticated 3D transform
    card.style.transform = `
      translateY(-4px) 
      translateX(${translateX}px) 
      translateZ(${translateY}px)
      rotateX(${rotateX}deg) 
      rotateY(${rotateY}deg)
      scale(1.02)
    `;
    
    // Add dynamic glow effect based on mouse position
    const glowIntensity = Math.min(
      Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)) / 
      Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2)), 
      1
    );
    
    card.style.boxShadow = `
      0 ${20 + glowIntensity * 20}px ${40 + glowIntensity * 20}px rgba(168, 85, 247, ${0.15 + glowIntensity * 0.1}),
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 0 ${30 + glowIntensity * 20}px rgba(168, 85, 247, ${0.1 + glowIntensity * 0.1})
    `;
  }

  handleMouseEnter(e) {
    const card = e.currentTarget;
    card.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
  }

  handleMouseLeave(e) {
    const card = e.currentTarget;
    
    // Smooth return to original position
    card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
    card.style.transform = 'translateY(0) translateX(0) translateZ(0) rotateX(0) rotateY(0) scale(1)';
    card.style.boxShadow = '';
    
    // Reset transition after animation
    setTimeout(() => {
      card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    }, 500);
  }
}

// Enhanced Card Interaction with Magnetic Effect
class MagneticCards {
  constructor() {
    this.cards = document.querySelectorAll('.feature-highlight');
    this.init();
  }

  init() {
    this.cards.forEach(card => {
      // Add magnetic hover effect to nearby cards
      card.addEventListener('mouseenter', () => {
        this.addMagneticEffect(card);
      });
      
      card.addEventListener('mouseleave', () => {
        this.removeMagneticEffect();
      });
    });
  }

  addMagneticEffect(activeCard) {
    this.cards.forEach(card => {
      if (card !== activeCard) {
        const rect1 = activeCard.getBoundingClientRect();
        const rect2 = card.getBoundingClientRect();
        
        // Calculate distance between cards
        const distance = Math.sqrt(
          Math.pow(rect1.left - rect2.left, 2) + 
          Math.pow(rect1.top - rect2.top, 2)
        );
        
        // Apply subtle magnetic effect to nearby cards
        if (distance < 200) {
          const strength = (200 - distance) / 200 * 0.3;
          const angle = Math.atan2(rect1.top - rect2.top, rect1.left - rect2.left);
          const moveX = Math.cos(angle) * strength * 2;
          const moveY = Math.sin(angle) * strength * 2;
          
          card.style.transform = `translate(${moveX}px, ${moveY}px) scale(${1 + strength * 0.01})`;
          card.style.opacity = 1 - strength * 0.05;
        }
      }
    });
  }

  removeMagneticEffect() {
    this.cards.forEach(card => {
      card.style.transform = '';
      card.style.opacity = '';
    });
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait a bit for elements to be rendered
  setTimeout(() => {
    new MouseTracker();
    new MagneticCards();
  }, 100);
});
