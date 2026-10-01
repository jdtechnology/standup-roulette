/**
 * Canvas Vegas Roulette Wheel Engine
 * Features High-DPI rendering, mahogany rim, brass turret, deflectors,
 * physics-based wheel and ball animation with pocket frets and audio feedback.
 */

class RouletteWheel {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.soundEngine = options.soundEngine || null;
    this.theme = options.theme || null;
    this.slices = []; // Array of participant objects { id, name, ... }

    // Wheel state
    this.wheelAngle = 0;
    this.wheelSpeed = 0;
    this.isSpinning = false;

    // Ball state
    this.ballAngle = 0;
    this.ballSpeed = 0;
    this.ballRadius = 0; // Current distance from center
    this.ballTrackRadius = 0; // Outer track distance
    this.ballPocketRadius = 0; // Inner pocket rest distance
    this.ballInPocket = true;
    this.ballTargetSliceIndex = -1;
    this.lastFretCross = -1;

    // Animation control
    this.animId = null;
    this.spinStartTime = 0;
    this.spinDuration = 6500; // ~6.5 seconds realistic casino spin
    this.targetWheelFinalAngle = 0;
    this.targetBallFinalAngle = 0;
    this.onSpinComplete = null;

    // Resize and initial draw
    this.handleResize = this.resize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.resize();
  }

  setTheme(theme) {
    this.theme = theme;
    this.draw();
  }

  setSlices(slices) {
    this.slices = slices || [];
    this.draw();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(rect.width || 600, rect.height || 600, 720);

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    this.centerX = size / 2;
    this.centerY = size / 2;
    this.radius = (size / 2) - 8;

    // Track radii
    this.ballTrackRadius = this.radius * 0.88;
    this.ballPocketRadius = this.radius * 0.63;
    if (this.ballInPocket) {
      this.ballRadius = this.ballPocketRadius;
    }

    this.draw();
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  /**
   * Triggers spin with target winning participant
   * @param {number} winningIndex Index in this.slices
   * @param {function} onComplete Callback when ball settles
   */
  spin(winningIndex, onComplete) {
    if (this.isSpinning || this.slices.length === 0) return;
    if (winningIndex < 0 || winningIndex >= this.slices.length) {
      winningIndex = Math.floor(Math.random() * this.slices.length);
    }

    this.isSpinning = true;
    this.ballInPocket = false;
    this.ballTargetSliceIndex = winningIndex;
    this.onSpinComplete = onComplete;
    this.spinStartTime = performance.now();

    const sliceAngle = (Math.PI * 2) / this.slices.length;
    // Target position for center of winning slice
    const targetSliceCenterOffset = (winningIndex + 0.5) * sliceAngle;

    // Calculate realistic rotations
    // Wheel spins clockwise: 4 to 6 full rotations
    const wheelRotations = 4 + Math.random() * 2;
    const startWheelAngle = this.wheelAngle % (Math.PI * 2);
    // Ball spins counter-clockwise (opposite to wheel): 8 to 11 rotations
    const ballRotations = 8 + Math.random() * 2;

    // We choose final wheel angle arbitrarily, then solve for ball landing in winning slice
    const finalWheelAngle = startWheelAngle + wheelRotations * Math.PI * 2 + Math.random() * Math.PI;
    // Ball final angle must match wheel's slice center angle:
    // theta_ball_final % 2pi = (finalWheelAngle + targetSliceCenterOffset) % 2pi
    const finalBallBase = finalWheelAngle + targetSliceCenterOffset;
    // Add ball rotations in opposite direction
    const finalBallAngle = finalBallBase - ballRotations * Math.PI * 2;

    this.startWheelAngle = startWheelAngle;
    this.finalWheelAngle = finalWheelAngle;
    this.startBallAngle = this.startWheelAngle; // Start near wheel
    this.finalBallAngle = finalBallAngle;

    this.lastFretCross = -1;

    if (this.soundEngine) {
      this.soundEngine.startSpinHum();
    }

    this.animate(performance.now());
  }

  /**
   * Main animation loop using cubic and quartic deceleration
   */
  animate(now) {
    const elapsed = now - this.spinStartTime;
    const progress = Math.min(1, elapsed / this.spinDuration);

    // Easing curves
    // Wheel decelerates smoothly: easeOutCubic
    const wheelEase = 1 - Math.pow(1 - progress, 3);
    this.wheelAngle = this.startWheelAngle + (this.finalWheelAngle - this.startWheelAngle) * wheelEase;

    // Ball eases: stays fast on track, then drops rapidly and catches the wheel
    // We use a custom ease for ball progress:
    // First 60% of time: fast spin on outer track
    // 60%-85%: rapid deceleration, drops into bowl
    // 85%-100%: micro-bounces and settles into pocket
    const ballEase = 1 - Math.pow(1 - progress, 4);
    this.ballAngle = this.startBallAngle + (this.finalBallAngle - this.startBallAngle) * ballEase;

    // Ball radius transition
    if (progress < 0.6) {
      // Riding outer mahogany rim track
      this.ballRadius = this.ballTrackRadius;
    } else if (progress < 0.88) {
      // Dropping into pocket ring
      const dropProgress = (progress - 0.6) / 0.28;
      const smoothDrop = Math.sin((dropProgress * Math.PI) / 2);
      this.ballRadius = this.ballTrackRadius - (this.ballTrackRadius - this.ballPocketRadius) * smoothDrop;

      // Add a slight bounce ripple
      const bounce = Math.sin(dropProgress * Math.PI * 5) * (1 - dropProgress) * 4;
      this.ballRadius += bounce;
    } else {
      // Settled in pocket
      this.ballRadius = this.ballPocketRadius;
    }

    // Fret crossing sound detection
    if (this.slices.length > 0 && this.soundEngine) {
      const sliceAngle = (Math.PI * 2) / this.slices.length;
      // Relative angle between ball and wheel
      const relAngle = ((this.ballAngle - this.wheelAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const currentFret = Math.floor(relAngle / sliceAngle);

      if (currentFret !== this.lastFretCross) {
        this.lastFretCross = currentFret;
        // Sound intensity scales with ball speed
        const speedFactor = Math.max(0.1, 1 - progress);
        this.soundEngine.playBallTick(speedFactor);
      }
    }

    this.draw();

    if (progress < 1) {
      this.animId = requestAnimationFrame(t => this.animate(t));
    } else {
      // Spin finished
      this.isSpinning = false;
      this.ballInPocket = true;
      if (this.soundEngine) {
        this.soundEngine.stopSpinHum();
      }

      const winner = this.slices[this.ballTargetSliceIndex];
      if (this.onSpinComplete) {
        this.onSpinComplete(winner);
      }
    }
  }

  /**
   * Main rendering routine
   */
  draw() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.radius;

    ctx.clearRect(0, 0, cx * 2, cy * 2);

    // 1. Outer Mahogany / Luxury Rim
    this.drawOuterRim(ctx, cx, cy, r);

    // 2. Ball Track (Outer Ring)
    this.drawBallTrack(ctx, cx, cy, r * 0.93, r * 0.82);

    // 3. Wheel Rotor (Slices + Names)
    this.drawRotor(ctx, cx, cy, r * 0.82, r * 0.44);

    // 4. Center Brass Turret & Chrome Spinner Handle
    this.drawCenterTurret(ctx, cx, cy, r * 0.44);

    // 5. Silver Ball
    this.drawBall(ctx, cx, cy);
  }

  /**
   * Renders wood rim with gold metallic studs
   */
  drawOuterRim(ctx, cx, cy, r) {
    const theme = this.theme || {};
    const outerColor = theme.rimColorOuter || '#2b1408';
    const innerColor = theme.rimColorInner || '#4a2511';
    const brass = theme.brassAccent || '#f5c518';

    // Drop shadow under the entire wheel
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 12;

    // Outer wooden bezel
    const rimGrad = ctx.createRadialGradient(cx, cy, r * 0.88, cx, cy, r);
    rimGrad.addColorStop(0, innerColor);
    rimGrad.addColorStop(0.5, outerColor);
    rimGrad.addColorStop(1, '#110703');

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.restore();

    // Brass accent ring around rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.98, 0, Math.PI * 2);
    ctx.strokeStyle = brass;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.83, 0, Math.PI * 2);
    ctx.strokeStyle = brass;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Brass Studs / Rivets
    const numStuds = 24;
    for (let i = 0; i < numStuds; i++) {
      const angle = (i * Math.PI * 2) / numStuds;
      const studDist = r * 0.94;
      const sx = cx + Math.cos(angle) * studDist;
      const sy = cy + Math.sin(angle) * studDist;

      const studGrad = ctx.createRadialGradient(sx - 1, sy - 1, 0.5, sx, sy, 3.5);
      studGrad.addColorStop(0, '#ffffff');
      studGrad.addColorStop(0.4, brass);
      studGrad.addColorStop(1, '#8c6d1f');

      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = studGrad;
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Renders recessed outer track where the ball spins
   */
  drawBallTrack(ctx, cx, cy, outerR, innerR) {
    const trackGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    trackGrad.addColorStop(0, '#0a0a0a');
    trackGrad.addColorStop(0.6, '#1a1a1a');
    trackGrad.addColorStop(1, '#080808');

    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = trackGrad;
    ctx.fill();

    // Metallic deflectors (8 chrome diamonds along track)
    const numDeflectors = 8;
    for (let i = 0; i < numDeflectors; i++) {
      const angle = (i * Math.PI * 2) / numDeflectors;
      const dR = (outerR + innerR) / 2;
      const dx = cx + Math.cos(angle) * dR;
      const dy = cy + Math.sin(angle) * dR;

      ctx.save();
      ctx.translate(dx, dy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(0, -3.5);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 3.5);
      ctx.closePath();

      const deflGrad = ctx.createLinearGradient(-5, -3, 5, 3);
      deflGrad.addColorStop(0, '#ffffff');
      deflGrad.addColorStop(0.5, '#d4af37');
      deflGrad.addColorStop(1, '#555555');

      ctx.fillStyle = deflGrad;
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Renders the spinning rotor with team member names
   */
  drawRotor(ctx, cx, cy, outerR, innerR) {
    const total = this.slices.length;
    const theme = this.theme || {};
    const fretColor = theme.fretColor || '#f3c64c';

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.wheelAngle);

    if (total === 0) {
      // Empty wheel state
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.arc(0, 0, innerR, 0, Math.PI * 2, true);
      ctx.fillStyle = '#222222';
      ctx.fill();

      ctx.fillStyle = '#aaaaaa';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No eligible participants', 0, -(outerR + innerR) / 2);
      ctx.restore();
      return;
    }

    const sliceAngle = (Math.PI * 2) / total;

    for (let i = 0; i < total; i++) {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const participant = this.slices[i];

      // Slice color calculation
      let sliceColor = '#b71234';
      if (typeof window !== 'undefined' && window.ThemeEngine) {
        sliceColor = window.ThemeEngine.getSliceColor(this.theme, i, total);
      }

      // Draw slice wedge
      ctx.beginPath();
      ctx.arc(0, 0, outerR, startAngle, endAngle);
      ctx.arc(0, 0, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = sliceColor;
      ctx.fill();

      // Metallic pocket divider fret lines
      ctx.beginPath();
      ctx.moveTo(Math.cos(startAngle) * innerR, Math.sin(startAngle) * innerR);
      ctx.lineTo(Math.cos(startAngle) * outerR, Math.sin(startAngle) * outerR);
      ctx.strokeStyle = fretColor;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Render Participant Name
      ctx.save();
      const midAngle = startAngle + sliceAngle / 2;
      ctx.rotate(midAngle);

      // Text position: oriented radially along slice
      const textRadius = (outerR + innerR) / 2;
      ctx.translate(textRadius, 0);

      // Font sizing dynamic based on slice count
      const fontSize = Math.min(14, Math.max(10, Math.floor(180 / total)));
      ctx.font = `600 ${fontSize}px "Segoe UI", Roboto, -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text shadow for maximum readability
      ctx.shadowColor = theme.textShadow || 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 4;
      ctx.fillStyle = theme.textColor || '#ffffff';

      // Truncate name if necessary
      const maxLen = total > 16 ? 9 : 14;
      let displayName = participant.name;
      if (displayName.length > maxLen) {
        displayName = displayName.substring(0, maxLen - 1) + '…';
      }

      ctx.fillText(displayName, 0, 0);
      ctx.restore();
    }

    // Outer & inner rim borders on rotor
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = fretColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, innerR, 0, Math.PI * 2);
    ctx.strokeStyle = fretColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Center brass cone and traditional roulette 4-handled crossbar
   */
  drawCenterTurret(ctx, cx, cy, turretR) {
    const theme = this.theme || {};
    const brass = theme.turretColor || '#d4af37';

    // Conical Brass Hub
    const turretGrad = ctx.createRadialGradient(
      cx - turretR * 0.25,
      cy - turretR * 0.25,
      turretR * 0.05,
      cx,
      cy,
      turretR
    );
    turretGrad.addColorStop(0, '#fff4cc');
    turretGrad.addColorStop(0.35, brass);
    turretGrad.addColorStop(0.85, '#997314');
    turretGrad.addColorStop(1, '#4d390a');

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, turretR, 0, Math.PI * 2);
    ctx.fillStyle = turretGrad;
    ctx.fill();
    ctx.restore();

    // Decorative inner brass rings
    ctx.beginPath();
    ctx.arc(cx, cy, turretR * 0.65, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff1b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4-Armed Spinner Handles (Rotates with wheel)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.wheelAngle);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.save();
      ctx.rotate(angle);

      // Chrome arm
      const armGrad = ctx.createLinearGradient(0, -4, turretR * 0.75, 4);
      armGrad.addColorStop(0, '#ffffff');
      armGrad.addColorStop(0.5, '#cccccc');
      armGrad.addColorStop(1, '#888888');

      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(0, -3, turretR * 0.72, 6, 3) : ctx.rect(0, -3, turretR * 0.72, 6);
      ctx.fillStyle = armGrad;
      ctx.fill();

      // Ball knob at handle end
      ctx.beginPath();
      ctx.arc(turretR * 0.72, 0, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    // Center polished cap
    const capGrad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, turretR * 0.28);
    capGrad.addColorStop(0, '#ffffff');
    capGrad.addColorStop(0.4, brass);
    capGrad.addColorStop(1, '#523e0c');

    ctx.beginPath();
    ctx.arc(0, 0, turretR * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = capGrad;
    ctx.fill();

    ctx.restore();
  }

  /**
   * Renders the silver roulette ball with specular lighting and shadow
   */
  drawBall(ctx, cx, cy) {
    if (this.slices.length === 0) return;

    const bx = cx + Math.cos(this.ballAngle) * this.ballRadius;
    const by = cy + Math.sin(this.ballAngle) * this.ballRadius;
    const ballSize = 6.5;

    ctx.save();
    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;

    // Specular silver 3D sphere gradient
    const ballGrad = ctx.createRadialGradient(
      bx - ballSize * 0.35,
      by - ballSize * 0.35,
      ballSize * 0.1,
      bx,
      by,
      ballSize
    );
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.3, '#f2f4f8');
    ballGrad.addColorStop(0.7, '#c0c5cc');
    ballGrad.addColorStop(1, '#71767e');

    ctx.beginPath();
    ctx.arc(bx, by, ballSize, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();
    ctx.restore();
  }
}

// Export for browser global & Node test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RouletteWheel;
}
if (typeof window !== 'undefined') {
  window.RouletteWheel = RouletteWheel;
}
