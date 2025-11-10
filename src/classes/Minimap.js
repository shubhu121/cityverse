import { Vector3 } from 'three';

class Minimap {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.size = 200; // Minimap size in pixels
    this.range = 400; // Detection range (same as ProximityDetector)
    this.scale = this.size / (this.range * 2); // pixels per unit
    
    this.createMinimapElement();
  }

  createMinimapElement() {
    // Create minimap container
    const container = document.createElement('div');
    container.id = 'minimap-container';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: ${this.size}px;
      height: ${this.size}px;
      background: rgba(38, 0, 75, 0.8);
      border: 2px solid #00fff7;
      border-radius: 4px;
      box-shadow: 0 0 20px rgba(0, 255, 247, 0.3);
      z-index: 100;
      display: none;
    `;

    // Create title
    const title = document.createElement('div');
    title.style.cssText = `
      position: absolute;
      top: -20px;
      left: 0;
      right: 0;
      text-align: center;
      font-family: 'Share Tech Mono', monospace;
      font-size: 0.7rem;
      color: #00fff7;
      text-shadow: 0 0 5px #00fff7;
      text-transform: uppercase;
    `;
    title.textContent = 'BILLBOARD RADAR';
    container.appendChild(title);

    // Create canvas for radar
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.cssText = `
      display: block;
      width: 100%;
      height: 100%;
    `;
    
    container.appendChild(this.canvas);
    document.body.appendChild(container);
    
    this.ctx = this.canvas.getContext('2d');
  }

  show() {
    const container = document.getElementById('minimap-container');
    if (container) {
      container.style.display = 'block';
    }
  }

  hide() {
    const container = document.getElementById('minimap-container');
    if (container) {
      container.style.display = 'none';
    }
  }

  update(playerPosition, playerRotation) {
    if (!this.ctx || !playerPosition) return;

    const ctx = this.ctx;
    const centerX = this.size / 2;
    const centerY = this.size / 2;

    // Clear canvas
    ctx.clearRect(0, 0, this.size, this.size);

    // Draw background with grid
    ctx.fillStyle = 'rgba(10, 14, 26, 0.3)';
    ctx.fillRect(0, 0, this.size, this.size);

    // Draw range circles
    ctx.strokeStyle = 'rgba(0, 255, 247, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const radius = (this.size / 2) * (i / 3);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw crosshair
    ctx.strokeStyle = 'rgba(0, 255, 247, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, this.size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(this.size, centerY);
    ctx.stroke();

    // Draw billboards
    if (window.game && window.game.interactiveObjects) {
      const tempVec = new Vector3();
      
      window.game.interactiveObjects.forEach((billboard) => {
        if (billboard.userData && billboard.userData.isMonadProject) {
          // Calculate relative position
          tempVec.set(
            billboard.position.x - playerPosition.x,
            billboard.position.y - playerPosition.y,
            billboard.position.z - playerPosition.z
          );
          
          const distance = Math.sqrt(tempVec.x * tempVec.x + tempVec.z * tempVec.z);
          
          // Only draw if within range
          if (distance <= this.range) {
            // Rotate point based on player rotation (so minimap rotates with player)
            const angle = playerRotation;
            const rotX = tempVec.x * Math.cos(angle) - tempVec.z * Math.sin(angle);
            const rotZ = tempVec.x * Math.sin(angle) + tempVec.z * Math.cos(angle);
            
            // Convert to screen coordinates
            const screenX = centerX + (rotX * this.scale);
            const screenY = centerY + (rotZ * this.scale);
            
            // Color based on distance
            let color;
            if (distance < 100) {
              color = '#fe435f'; // Close - red/pink
            } else if (distance < 200) {
              color = '#fd308e'; // Medium - magenta
            } else {
              color = '#a936db'; // Far - purple
            }
            
            // Draw billboard dot
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Draw pulsing ring for very close billboards
            if (distance < 50) {
              const pulseSize = 6 + Math.sin(Date.now() / 200) * 2;
              ctx.strokeStyle = color;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(screenX, screenY, pulseSize, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
        }
      });
    }

    // Draw player (center)
    ctx.fillStyle = '#00fff7';
    ctx.shadowColor = '#00fff7';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw player direction indicator
    ctx.strokeStyle = '#00fff7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY - 15);
    ctx.stroke();

    // Draw range indicator text
    ctx.fillStyle = 'rgba(0, 255, 247, 0.5)';
    ctx.font = '10px Share Tech Mono';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.range}m`, centerX, this.size - 5);
  }
}

export { Minimap };
