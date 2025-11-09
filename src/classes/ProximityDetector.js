import { Vector3 } from 'three';

class ProximityDetector {
  constructor() {
    this.nearbyProjects = [];
    this.maxDistance = 400; // Detection radius
    this.updateInterval = 30; // Update every 30 frames for performance
    this.frameCounter = 0;
  }

  update(playerPosition) {
    this.frameCounter++;
    
    // Only update every N frames for performance
    if (this.frameCounter % this.updateInterval !== 0) {
      return;
    }

    if (!window.game || !window.game.interactiveObjects || !playerPosition) {
      return;
    }

    // Find all project billboards within range
    const tempVec = new Vector3();
    this.nearbyProjects = [];

    window.game.interactiveObjects.forEach((billboard) => {
      if (billboard.userData && billboard.userData.isMonadProject) {
        // Calculate distance
        tempVec.set(
          billboard.position.x,
          billboard.position.y,
          billboard.position.z
        );
        
        const distance = playerPosition.distanceTo(tempVec);
        
        if (distance <= this.maxDistance) {
          this.nearbyProjects.push({
            project: billboard.userData.project,
            distance: Math.round(distance),
            billboard: billboard
          });
        }
      }
    });

    // Sort by distance (closest first)
    this.nearbyProjects.sort((a, b) => a.distance - b.distance);

    // Limit to top 5 nearest
    this.nearbyProjects = this.nearbyProjects.slice(0, 5);

    // Update UI
    this.updateUI();
  }

  updateUI() {
    const resourcesPanel = document.getElementById('resources');
    if (!resourcesPanel) return;

    if (this.nearbyProjects.length === 0) {
      resourcesPanel.innerHTML = '>> Scanning for Monad projects...';
      return;
    }

    let html = '>> <span class="g1">NEARBY MONAD PROJECTS</span><br><br>';
    
    this.nearbyProjects.forEach((item, index) => {
      const distanceUnits = item.distance + 'm';
      const projectName = item.project.name || 'Unknown';
      
      // Color code by distance
      let colorClass = 'g1'; // Green (close)
      if (item.distance > 200) colorClass = 'g3';
      else if (item.distance > 100) colorClass = 'g2';
      
      html += `<span class="${colorClass}">⬤</span> <span class="c2">${projectName}</span> <span class="c4">[${distanceUnits}]</span><br>`;
    });

    resourcesPanel.innerHTML = html;
  }

  getNearestProject() {
    return this.nearbyProjects.length > 0 ? this.nearbyProjects[0] : null;
  }
}

export { ProximityDetector };
