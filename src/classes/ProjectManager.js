import {
  TextureLoader,
  SRGBColorSpace,
  MeshBasicMaterial
} from 'three';

class ProjectManager {
  constructor() {
    this.projects = [];
    this.textureLoader = new TextureLoader();
    this.projectMaterials = {};
    this.loaded = false;
  }

  async load() {
    try {
      console.log('ProjectManager: Loading projects...');
      const response = await fetch('assets/projects-list.json');
      const allProjects = await response.json();
      
      // Load only first 10 projects for testing
      this.projects = allProjects.slice(0, 10);
      
      // Mark as loaded immediately so billboards can use project data
      this.loaded = true;
      
      console.log('ProjectManager: Loaded', this.projects.length, 'projects');
      
      // Preload textures in background (async, billboards will use fallback until ready)
      this.preloadTextures();
      
    } catch (error) {
      console.error('ProjectManager: Failed to load projects', error);
      this.loaded = false;
    }
  }

  preloadTextures() {
    this.projects.forEach((project, index) => {
      if (project.img && project.img !== 'https://cdn.prod.website-files.com/plugins/Basic/assets/placeholder.60f9b1840c.svg') {
        this.loadProjectTexture(index, project.img);
      }
    });
  }

  loadProjectTexture(index, imageUrl) {
    this.textureLoader.load(
      imageUrl,
      (texture) => {
        texture.colorSpace = SRGBColorSpace;
        
        // Create material with project banner
        const material = new MeshBasicMaterial({
          map: texture,
          emissive: 0x444444, // Subtle grey instead of white
          emissiveIntensity: 0.15, // Minimal glow - realistic billboard
          transparent: false
        });
        
        this.projectMaterials[index] = material;
        console.log('✓ ProjectManager: Loaded texture for', this.projects[index].name);
      },
      undefined,
      (error) => {
        console.warn('ProjectManager: Failed to load texture for', this.projects[index].name, error);
      }
    );
  }

  getProject(index) {
    return this.projects[index % this.projects.length];
  }

  getProjectMaterial(index) {
    const projectIndex = index % this.projects.length;
    if (this.projectMaterials[projectIndex]) {
      return this.projectMaterials[projectIndex];
    }
    // Fallback to default material if texture not loaded yet
    return null;
  }

  getProjectCount() {
    return this.projects.length;
  }
}

export { ProjectManager };
