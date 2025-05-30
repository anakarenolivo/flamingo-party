interface FlamingoProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

const FLAMINGO_COLOR = '#F96574'; // Theme flamingoPink
const FLAMINGO_BEAK_COLOR = '#333333'; // Darker gray for beak
const FLAMINGO_LEG_COLOR = '#333333'; // Darker gray for legs
const GAME_OVER_FLAMINGO_COLOR = '#999999'; // Lighter Gray for game over

// This is a simple class-based representation for now.
// It could also be a functional component if it were managing its own React state or lifecycle,
// but for purely drawing logic that GameCanvas will control, a class is straightforward.
export class Flamingo {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number; // For gravity and flapping
  gravity: number;
  lift: number;
  groundY: number; // Added to respect ground boundary

  constructor(initialX: number, initialY: number, groundY: number) {
    this.x = initialX;
    this.width = 45; // Slightly larger
    this.height = 35; // Slightly larger
    this.y = initialY;
    this.velocityY = 0;
    this.gravity = 0.5;
    this.lift = -10;
    this.groundY = groundY; // Store ground position
  }

  flap() {
    this.velocityY = this.lift;
  }

  update() {
    this.velocityY += this.gravity;
    this.y += this.velocityY;

    // Prevent flamingo from falling through the bottom
    if (this.y + this.height > this.groundY) {
      this.y = this.groundY - this.height;
      this.velocityY = 0;
    }

    // Prevent flamingo from going above the top (optional)
    if (this.y < 0) {
      this.y = 0;
      this.velocityY = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D, isGameOver: boolean) {
    const x = this.x;
    const y = this.y;
    const bodyWidth = this.width * 0.8;
    const bodyHeight = this.height;
    const headRadius = this.height * 0.3;
    const neckLength = this.height * 0.4;
    const legLength = this.height * 0.6;
    const legThickness = Math.max(2, this.width / 18);

    ctx.save();
    // Tilt slightly when flapping - for future enhancement, not now
    // const angle = this.velocityY < -2 ? -Math.PI / 12 : (this.velocityY > 2 ? Math.PI / 12 : 0);
    // ctx.translate(x + bodyWidth / 2, y + bodyHeight / 2);
    // ctx.rotate(angle);
    // ctx.translate(-(x + bodyWidth / 2), -(y + bodyHeight / 2));

    const currentFlamingoColor = isGameOver ? GAME_OVER_FLAMINGO_COLOR : FLAMINGO_COLOR;

    // Legs (draw first so body is on top)
    if (!isGameOver) {
      ctx.strokeStyle = FLAMINGO_LEG_COLOR;
      ctx.lineWidth = legThickness;
      ctx.lineCap = 'round';
      // Leg 1 (backwards facing typically)
      ctx.beginPath();
      ctx.moveTo(x + bodyWidth * 0.4, y + bodyHeight * 0.7);
      ctx.lineTo(x + bodyWidth * 0.2, y + bodyHeight * 0.7 + legLength * 0.5);
      ctx.lineTo(x + bodyWidth * 0.3, y + bodyHeight * 0.7 + legLength);
      ctx.stroke();
      // Leg 2
      ctx.beginPath();
      ctx.moveTo(x + bodyWidth * 0.6, y + bodyHeight * 0.7);
      ctx.lineTo(x + bodyWidth * 0.5, y + bodyHeight * 0.7 + legLength * 0.6);
      ctx.lineTo(x + bodyWidth * 0.65, y + bodyHeight * 0.7 + legLength);
      ctx.stroke();
    }

    // Body (more elongated oval)
    ctx.fillStyle = currentFlamingoColor;
    ctx.beginPath();
    ctx.ellipse(x + bodyWidth / 2, y + bodyHeight / 2, bodyWidth / 2, bodyHeight / 2.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Neck (curved)
    ctx.strokeStyle = currentFlamingoColor; // Neck is same color as body
    ctx.lineWidth = headRadius * 0.8; // Neck thickness
    ctx.beginPath();
    ctx.moveTo(x + bodyWidth * 0.7, y + bodyHeight * 0.3);
    ctx.quadraticCurveTo(
      x + bodyWidth * 0.9 + neckLength * 0.5, y - neckLength * 0.2, // control point for S-curve
      x + bodyWidth * 0.75 + neckLength, y - neckLength * 0.3 + headRadius // end at head base
    );
    ctx.stroke();

    // Head
    const headX = x + bodyWidth * 0.75 + neckLength;
    const headY = y - neckLength * 0.3;
    ctx.fillStyle = currentFlamingoColor;
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = FLAMINGO_BEAK_COLOR;
    ctx.beginPath();
    const beakTipX = headX + headRadius * 1.5;
    const beakTipY = headY;
    ctx.moveTo(beakTipX, beakTipY); // Tip of beak
    ctx.lineTo(headX + headRadius * 0.8, headY - headRadius * 0.3); // Top base of beak
    ctx.lineTo(headX + headRadius * 0.8, headY + headRadius * 0.3); // Bottom base of beak
    ctx.closePath();
    ctx.fill();

    // Eye
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(headX + headRadius * 0.2, headY - headRadius * 0.1, headRadius * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }
}

export default Flamingo; 