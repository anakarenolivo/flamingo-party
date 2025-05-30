export const OBSTACLE_WIDTH = 70;
export const OBSTACLE_COLOR = '#A98467'; // Theme trunkBrown
export const LEAF_COLOR = '#72B043';   // Theme leafGreen
export const GAP_HEIGHT = 160; // Slightly wider gap
export const OBSTACLE_SPEED = 3;
export const OBSTACLE_INTERVAL = 350; // Horizontal distance between obstacles

interface ObstacleProps {
  x: number;
  y: number; // y position of the top obstacle's bottom edge
  height: number; // height of the top obstacle
  width: number;
  gap: number;
  speed: number;
  canvasHeight: number;
}

export class Obstacle {
  x: number;
  y: number; // y position of the top obstacle's bottom edge
  height: number; // height of the top obstacle
  width: number;
  gap: number;
  speed: number;
  canvasHeight: number;
  passed: boolean; // To track if the flamingo has passed this obstacle for scoring
  topHeight: number; // Added to store the height of the top obstacle
  isActive: boolean; // Added for object pooling

  constructor({
    x,
    y,
    height,
    width,
    gap,
    speed,
    canvasHeight,
  }: ObstacleProps) {
    this.x = x;
    this.y = y;
    this.height = height;
    this.width = width;
    this.gap = gap;
    this.speed = speed;
    this.canvasHeight = canvasHeight;
    this.passed = false;
    this.topHeight = height;
    this.isActive = true; // Active by default when created
  }

  reset({
    x,
    y,
    height,
    width,
    gap,
    speed,
    canvasHeight,
  }: ObstacleProps): void {
    this.x = x;
    this.y = y;
    this.height = height;
    this.width = width;
    this.gap = gap;
    this.speed = speed;
    this.canvasHeight = canvasHeight;
    this.passed = false;
    this.topHeight = height;
    this.isActive = true;
  }

  update() {
    this.x -= this.speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Trunk color from theme
    ctx.fillStyle = OBSTACLE_COLOR;

    // Draw top obstacle trunk
    ctx.fillRect(this.x, 0, this.width, this.height);
    // Draw bottom obstacle trunk
    const bottomObstacleY = this.height + this.gap;
    const bottomObstacleHeight = this.canvasHeight - bottomObstacleY;
    ctx.fillRect(this.x, bottomObstacleY, this.width, bottomObstacleHeight);

    // Draw palm leaves
    ctx.fillStyle = LEAF_COLOR;
    const leafCount = 5;
    const leafLength = this.width * 1.2;
    const leafWidth = this.width * 0.3;

    // Leaves for top obstacle (pointing down and spreading)
    const topPalmCenterX = this.x + this.width / 2;
    const topPalmCrownY = this.height; // Base of the leaves for the top palm

    for (let i = 0; i < leafCount; i++) {
      ctx.beginPath();
      // Angle each leaf. Spread from -PI/3 to PI/3 from bottom center (PI/2)
      const angle = Math.PI / 2 + (i - (leafCount - 1) / 2) * (Math.PI / (leafCount * 1.5));
      ctx.moveTo(topPalmCenterX, topPalmCrownY - leafWidth / 2); // Start near trunk center top
      
      // Control point for curve
      const cp1x = topPalmCenterX + Math.cos(angle - Math.PI/16) * leafLength * 0.5;
      const cp1y = topPalmCrownY + Math.sin(angle - Math.PI/16) * leafLength * 0.5;
      // End point of the leaf
      const endX = topPalmCenterX + Math.cos(angle) * leafLength;
      const endY = topPalmCrownY + Math.sin(angle) * leafLength;
      // Other side of the leaf base
      const baseEndX = topPalmCenterX + Math.cos(angle + Math.PI/8) * leafWidth * 0.5;
      const baseEndY = topPalmCrownY + Math.sin(angle + Math.PI/8) * leafWidth * 0.5;

      ctx.quadraticCurveTo(cp1x, cp1y, endX, endY);
      // Create a bit of width by drawing another curve back to a point near the start
      ctx.lineTo(baseEndX, baseEndY);
      ctx.closePath();
      ctx.fill();
    }

    // Leaves for bottom obstacle (pointing up and spreading)
    const bottomPalmCenterX = this.x + this.width / 2;
    const bottomPalmCrownY = bottomObstacleY; // Top of the bottom trunk

    for (let i = 0; i < leafCount; i++) {
      ctx.beginPath();
      // Angle each leaf. Spread from -PI/3 to PI/3 from top center (-PI/2)
      const angle = -Math.PI / 2 + (i - (leafCount - 1) / 2) * (Math.PI / (leafCount * 1.5));
      ctx.moveTo(bottomPalmCenterX, bottomPalmCrownY + leafWidth / 2); // Start near trunk center bottom
      
      const cp1x = bottomPalmCenterX + Math.cos(angle - Math.PI/16) * leafLength * 0.5;
      const cp1y = bottomPalmCrownY + Math.sin(angle - Math.PI/16) * leafLength * 0.5;
      const endX = bottomPalmCenterX + Math.cos(angle) * leafLength;
      const endY = bottomPalmCrownY + Math.sin(angle) * leafLength;
      const baseEndX = bottomPalmCenterX + Math.cos(angle + Math.PI/8) * leafWidth * 0.5;
      const baseEndY = bottomPalmCrownY + Math.sin(angle + Math.PI/8) * leafWidth * 0.5;
      
      ctx.quadraticCurveTo(cp1x, cp1y, endX, endY);
      ctx.lineTo(baseEndX, baseEndY);
      ctx.closePath();
      ctx.fill();
    }
  }

  isOffScreen(): boolean {
    return this.x + this.width < 0;
  }

  deactivate(): void { // Method to mark as inactive for pooling
    this.isActive = false;
  }

  getBoundsTop() {
    return { x: this.x, y: 0, width: this.width, height: this.topHeight };
  }

  getBoundsBottom() {
    const bottomObstacleY = this.topHeight + this.gap;
    const bottomObstacleHeight = this.canvasHeight - bottomObstacleY;
    return {
      x: this.x,
      y: bottomObstacleY,
      width: this.width,
      height: bottomObstacleHeight,
    };
  }

  getBounds() {
    return [
      { x: this.x, y: 0, width: this.width, height: this.topHeight }, // Top part
      {
        x: this.x,
        y: this.topHeight + this.gap,
        width: this.width,
        height: this.canvasHeight - this.topHeight - this.gap, // Bottom part
      },
    ];
  }
}

// Helper function to generate a new obstacle with random gap position
export const generateObstacle = (
  canvasWidth: number,
  canvasHeight: number,
  obstaclePool: Obstacle[] = [], // Optional pool parameter
): Obstacle => {
  const minHeight = 50; // Minimum height for the top obstacle
  const maxHeight = canvasHeight - GAP_HEIGHT - minHeight; // Max height for top, ensuring gap and min bottom height

  const topObstacleHeight =
    Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

  const obstacleProps: ObstacleProps = {
    x: canvasWidth, // Start at the right edge of the canvas
    y: topObstacleHeight, // This 'y' is effectively the height of the top obstacle
    height: topObstacleHeight,
    width: OBSTACLE_WIDTH,
    gap: GAP_HEIGHT,
    speed: OBSTACLE_SPEED,
    canvasHeight: canvasHeight,
  };

  // Try to reuse an obstacle from the pool
  const pooledObstacle = obstaclePool.find(obs => !obs.isActive);
  if (pooledObstacle) {
    pooledObstacle.reset(obstacleProps);
    return pooledObstacle;
  }

  // If no inactive obstacle in pool, create a new one
  return new Obstacle(obstacleProps);
}; 