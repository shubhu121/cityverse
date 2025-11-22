class NearbyProjectsHUD {
  constructor() {
    this.container = null;
    this.contentEl = null;
    this.nearestProject = null; // Store the nearest project for keyboard shortcuts
    this.create();
  }

  create() {
    // Root container
    const c = document.createElement('div');
    c.id = 'nearby-hud';
    c.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      width: 280px;
      background: rgba(10, 14, 26, 0.85);
      border: 1px solid #00fff7;
      border-left: 4px solid #00fff7;
      box-shadow: 0 0 15px rgba(0, 255, 247, 0.15);
      font-family: 'Share Tech Mono', monospace;
      color: #00fff7;
      z-index: 110;
      display: none;
      backdrop-filter: blur(4px);
      pointer-events: auto;
      padding: 15px;
    `;

    // Content container
    const content = document.createElement('div');
    content.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;

    c.appendChild(content);
    document.body.appendChild(c);

    this.container = c;
    this.contentEl = content;
  }

  show() {
    if (this.container) this.container.style.display = 'block';
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }

  update(nearbyProjects) {
    if (!this.contentEl) return;

    // If nothing nearby, hide the box
    if (!nearbyProjects || nearbyProjects.length === 0) {
      this.nearestProject = null;
      this.hide();
      return;
    }

    // Show the box if hidden
    if (this.container.style.display === 'none') {
      this.show();
    }

    // Get the nearest project
    const nearest = nearbyProjects[0];
    const { project, distance } = nearest;

    // Store for keyboard shortcuts
    this.nearestProject = project;

    const name = project?.name || 'Unknown Project';
    const url = project?.url && project.url.trim() !== '' ? project.url : null;
    const x = project?.twitter && project.twitter.trim() !== '' ? project.twitter : null;

    let html = `
      <div style="font-size: 0.75rem; color: rgba(0,255,247,0.6); margin-bottom: 2px;">NEARBY PROJECT [${distance}m]</div>
      <div style="font-size: 1.1rem; font-weight: bold; color: #fff; text-shadow: 0 0 5px rgba(255,255,255,0.5); margin-bottom: 8px;">${name}</div>
    `;

    if (url) {
      html += `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #00fff7;">></span>
          <a href="${url}" target="_blank" rel="noopener" style="color: #00fff7; text-decoration: none; border-bottom: 1px dotted #00fff7; transition: all 0.2s;">
            Website <span style="color: rgba(0,255,247,0.5); font-size: 0.8rem;">[O]</span>
          </a>
        </div>
      `;
    }

    if (x) {
      html += `
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #fd308e;">></span>
          <a href="${x}" target="_blank" rel="noopener" style="color: #fd308e; text-decoration: none; border-bottom: 1px dotted #fd308e; transition: all 0.2s;">
            X (Twitter) <span style="color: rgba(253,48,142,0.5); font-size: 0.8rem;">[X]</span>
          </a>
        </div>
      `;
    }

    this.contentEl.innerHTML = html;
  }

  openWebsite() {
    if (this.nearestProject && this.nearestProject.url && this.nearestProject.url.trim() !== '') {
      window.open(this.nearestProject.url, '_blank');
      return true;
    }
    return false;
  }

  openTwitter() {
    if (this.nearestProject && this.nearestProject.twitter && this.nearestProject.twitter.trim() !== '') {
      window.open(this.nearestProject.twitter, '_blank');
      return true;
    }
    return false;
  }
}

export { NearbyProjectsHUD };
