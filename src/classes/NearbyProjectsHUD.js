class NearbyProjectsHUD {
  constructor() {
    this.container = null;
    this.titleEl = null;
    this.listEl = null;
    this.maxItems = 5;
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
      width: 300px;
      max-height: 320px;
      overflow-y: auto;
      background: rgba(10, 14, 26, 0.72);
      border: 2px solid #00fff7;
      border-radius: 4px;
      box-shadow: 0 0 20px rgba(0, 255, 247, 0.25);
      font-family: 'Share Tech Mono', monospace;
      color: #00fff7;
      text-shadow: 0 0 5px #00fff7;
      z-index: 110;
      display: none;
      backdrop-filter: blur(6px);
      pointer-events: auto;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 8px 10px;
      font-size: 0.8rem;
      border-bottom: 1px solid rgba(0,255,247,0.35);
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    const bullet = document.createElement('span');
    bullet.textContent = '◆';
    bullet.style.color = '#fd308e';
    bullet.style.textShadow = '0 0 6px #fd308e';

    const title = document.createElement('span');
    title.textContent = 'NEARBY PROJECTS';
    title.style.letterSpacing = '1px';

    header.appendChild(bullet);
    header.appendChild(title);

    // List container
    const list = document.createElement('div');
    list.style.cssText = `
      padding: 8px 10px;
      font-size: 0.8rem;
      line-height: 1.4;
    `;

    c.appendChild(header);
    c.appendChild(list);

    document.body.appendChild(c);

    this.container = c;
    this.titleEl = title;
    this.listEl = list;
  }

  show() {
    if (this.container) this.container.style.display = 'block';
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }

  update(nearbyProjects) {
    if (!this.listEl) return;

    // If nothing nearby, show a subtle scanning message
    if (!nearbyProjects || nearbyProjects.length === 0) {
      this.listEl.innerHTML = `>> Scanning...`;
      return;
    }

    const items = nearbyProjects.slice(0, this.maxItems);

    const html = items.map(({ project, distance }) => {
      const name = project?.name || 'Unknown';
      const url = project?.url && project.url.trim() !== '' ? project.url : null;
      const x = project?.twitter && project.twitter.trim() !== '' ? project.twitter : null;

      // Color by distance
      let color = '#fe435f'; // close
      if (distance > 200) color = '#a936db';
      else if (distance > 100) color = '#fd308e';

      const openLink = url
        ? `<a href="${url}" target="_blank" rel="noopener" style="color:#00ff95;text-shadow:0 0 6px #00ff95; text-decoration:none;">[open]</a>`
        : `<span style="color:rgba(255,255,255,0.35)">[open]</span>`;

      const xLink = x
        ? `<a href="${x}" target="_blank" rel="noopener" style="color:#ff00ff;text-shadow:0 0 6px #ff00ff; text-decoration:none;">[x]</a>`
        : `<span style="color:rgba(255,255,255,0.35)">[x]</span>`;

      return `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:6px 0; border-bottom:1px dashed rgba(0,255,247,0.15);">
          <div style="display:flex; align-items:center; gap:8px; min-width:0;">
            <span style="color:${color}; text-shadow: 0 0 6px ${color};">⬤</span>
            <span title="${name}" style="color:#f3e3ff; text-shadow:0 0 6px #f3e3ff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:150px;">${name}</span>
          </div>
          <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
            <span style="color:#00fff7;opacity:0.9;">${distance}m</span>
            ${openLink}
            ${xLink}
          </div>
        </div>
      `;
    }).join('');

    this.listEl.innerHTML = html;
  }
}

export { NearbyProjectsHUD };
