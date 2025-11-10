import {
  Mesh,
  ConeGeometry,
  MeshBasicMaterial,
  Group,
  RingGeometry,
  DoubleSide,
  Vector3
} from 'three';

/**
 * Visual indicator that floats above buildings with project billboards
 * Shows an animated arrow and pulsing ring
 */
class BillboardIndicator {
  constructor(position, project, buildingHeight = 200) {
    this.project = project;
    this.originalY = position.y;
    this.group = new Group();
    this.animationTime = Math.random() * Math.PI * 2; // Random start phase
    
    // Create arrow (cone pointing down) - larger and more visible
    const arrowGeometry = new ConeGeometry(8, 20, 4);
    const arrowMaterial = new MeshBasicMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.95
    });
    
    this.arrow = new Mesh(arrowGeometry, arrowMaterial);
    this.arrow.rotation.x = Math.PI; // Point down
    this.group.add(this.arrow);
    
    // Create pulsing ring around arrow - larger
    const ringGeometry = new RingGeometry(10, 14, 32);
    const ringMaterial = new MeshBasicMaterial({
      color: 0x00fff7,
      emissive: 0x00fff7,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.7,
      side: DoubleSide
    });
    
    this.ring = new Mesh(ringGeometry, ringMaterial);
    this.ring.rotation.x = Math.PI / 2; // Make it horizontal
    this.group.add(this.ring);
    
    // Position the indicator well above the building
    this.group.position.copy(position);
    this.group.position.y = buildingHeight + 40; // Hover above building top
    
    // Add to scene
    window.game.scene.add(this.group);
    
    console.log('✨ Created billboard indicator at:', this.group.position, 'for project:', project.name);
  }

  update(deltaTime) {
    this.animationTime += deltaTime * 2;
    
    // Bobbing animation for arrow
    const bobOffset = Math.sin(this.animationTime) * 5;
    this.arrow.position.y = bobOffset;
    
    // Pulsing animation for ring
    const pulseScale = 1 + Math.sin(this.animationTime * 1.5) * 0.3;
    this.ring.scale.set(pulseScale, pulseScale, 1);
    
    // Pulsing opacity for ring
    this.ring.material.opacity = 0.4 + Math.sin(this.animationTime * 1.5) * 0.3;
    
    // Rotate arrow slowly
    this.arrow.rotation.y += deltaTime * 0.5;
  }

  remove() {
    if (this.group.parent) {
      window.game.scene.remove(this.group);
    }
    
    // Dispose geometries and materials
    this.arrow.geometry.dispose();
    this.arrow.material.dispose();
    this.ring.geometry.dispose();
    this.ring.material.dispose();
  }

  // Check if indicator should be visible based on distance
  shouldBeVisible(playerPosition, maxDistance = 300) {
    const distance = this.group.position.distanceTo(playerPosition);
    return distance <= maxDistance;
  }

  setVisibility(visible) {
    this.group.visible = visible;
  }
}

/**
 * Manager for all billboard indicators
 * Handles creation, updates, and cleanup of indicators
 */
class BillboardIndicatorManager {
  constructor() {
    this.indicators = new Map(); // Billboard UUID -> Indicator
    this.maxVisibleDistance = 300;
    this.updateInterval = 10; // Update visibility every N frames
    this.frameCounter = 0;
  }

  /**
   * Create indicator for a billboard
   */
  addIndicator(billboard, buildingHeight) {
    if (!billboard.userData || !billboard.userData.isMonadProject) {
      return;
    }

    const uuid = billboard.uuid;
    
    // Don't create duplicate indicators
    if (this.indicators.has(uuid)) {
      return;
    }

    const indicator = new BillboardIndicator(
      billboard.position,
      billboard.userData.project,
      buildingHeight || 200
    );
    
    this.indicators.set(uuid, indicator);
    console.log('📍 BillboardIndicatorManager: Added indicator for', billboard.userData.project.name);
  }

  /**
   * Remove indicator for a billboard
   */
  removeIndicator(billboardUuid) {
    const indicator = this.indicators.get(billboardUuid);
    if (indicator) {
      indicator.remove();
      this.indicators.delete(billboardUuid);
    }
  }

  /**
   * Update all indicators
   */
  update(deltaTime, playerPosition) {
    this.frameCounter++;
    
    // Update visibility check less frequently for performance
    const shouldUpdateVisibility = this.frameCounter % this.updateInterval === 0;
    
    this.indicators.forEach((indicator, uuid) => {
      // Animate
      indicator.update(deltaTime);
      
      // Update visibility based on distance
      if (shouldUpdateVisibility && playerPosition) {
        const visible = indicator.shouldBeVisible(playerPosition, this.maxVisibleDistance);
        indicator.setVisibility(visible);
      }
    });
  }

  /**
   * Remove all indicators
   */
  clear() {
    this.indicators.forEach((indicator) => {
      indicator.remove();
    });
    this.indicators.clear();
  }

  /**
   * Get count of active indicators
   */
  getCount() {
    return this.indicators.size;
  }
}

export { BillboardIndicator, BillboardIndicatorManager };
