import {
  Clock,
  Scene,
  WebGLRenderer,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  PerspectiveCamera,
  BufferGeometry,
  Mesh,
  Vector2,
  Fog,
  DirectionalLight,
  AmbientLight,
  PointLight,
  Audio,
  AudioLoader,
  AudioListener,
  Raycaster
} from 'three';

import { PointerLockControls }  from 'three/examples/jsm/controls/PointerLockControls.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';

import { AssetManager } from './classes/AssetManager.js';
import { Shaders } from './classes/Shaders.js';
import { ProjectManager } from './classes/ProjectManager.js';
import { ProximityDetector } from './classes/ProximityDetector.js';
import { Minimap } from './classes/Minimap.js';
import { BillboardIndicatorManager } from './classes/BillboardIndicator.js';

import { Player } from './classes/Player.js';
import { PlayerCar } from './classes/PlayerCar.js';
import { PlayerController } from './classes/PlayerController.js';

import { Radio } from './classes/Radio.js';

import { Generator } from './classes/Generator.js';
import { GeneratorItem_CityBlock } from './classes/GeneratorItem_CityBlock.js';
import { GeneratorItem_CityLight } from './classes/GeneratorItem_CityLight.js';
import { GeneratorItem_Traffic } from './classes/GeneratorItem_Traffic.js';

import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { Collider } from './classes/Collider.js';

window.game = new Game();

class Game {

  constructor() {

    this.initialized = false;

    this.environment = this.getEnvironment('night');

    // query params

    const urlParams = new URLSearchParams(window.location.search);

    this.uiOnUnfocus = true;
    if (urlParams.has('uiOnUnfocus')) this.uiOnUnfocus = urlParams.get('uiOnUnfocus')==1 ? true : false;

    // elements

    this.blocker = document.getElementById( 'blocker' );
    this.enterBtn = document.getElementById( 'enterBtn' );
    this.canvas = document.getElementById('canvas');

    // fade in / volume

    this.canvasOpacity = 0;
    this.masterVolume = 0;
    this.userMasterVolume = 1;

    // launch button

    this.enterBtn.addEventListener( 'click', () => this.onEnterClick(), false );

    // world settings (do not change)

    this.cityBlockSize = 128;
    this.roadWidth = 24;

    // collision

    BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
    BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
    Mesh.prototype.raycast = acceleratedRaycast;

    this.collider = new Collider();

    // Interactive objects for click detection
    this.interactiveObjects = [];
    this.raycaster = null;
    this.mouse = { x: 0, y: 0 };

    // Proximity detector for nearby projects
    this.proximityDetector = null;

  }

  async load() {

    this.assets = new AssetManager();
    this.assets.setPath('assets/');
    this.assets.load();

    // Load Monad projects - wait for it to complete
    this.projectManager = new ProjectManager();
    await this.projectManager.load();
    console.log('Game: ProjectManager ready');

  }

  onLoad() {

    // terminal
    window.setColor('c2');
    window.newLine();
    window.newLine();
    window.write('>> boot sequence complete', 0, 0, null);
    window.showCredits();

    // show launch button
    document.getElementById('enterBtn').style.display = 'block';

  }

  init() {

    if (this.initialized) return;
    this.initialized = true;

    console.log('Game: Initializing');

    /*----- user settings -----*/

    // defaults
    this.settings = {
      mode: 'drive',
      worldSeed: 9746,
      music: true,
      soundFx: true,
      windshieldShader: 'simple',
      renderScaling: 1.0
    };

    if (window.userSettings.hasOwnProperty('mode')) this.settings.mode = window.userSettings.mode;
    if (window.userSettings.hasOwnProperty('worldSeed')) this.settings.worldSeed = window.userSettings.worldSeed;
    if (window.userSettings.hasOwnProperty('music')) this.settings.music = window.userSettings.music;
    if (window.userSettings.hasOwnProperty('soundFx')) this.settings.soundFx = window.userSettings.soundFx;
    if (window.userSettings.hasOwnProperty('renderScaling')) this.settings.renderScaling = parseFloat(window.userSettings.renderScaling);
    if (window.userSettings.hasOwnProperty('windshieldShader')) this.settings.windshieldShader = window.userSettings.windshieldShader;

    console.log('Game: World seed: '+this.settings.worldSeed);

    /*----- setup -----*/

    // audio loader

    this.audioLoader = new AudioLoader();
    this.audioListener = null;
    this.audioInitialized = false;

    // renderer

    this.renderer = new WebGLRenderer({canvas: this.canvas});
    this.renderer.setPixelRatio( window.devicePixelRatio*this.settings.renderScaling );
    this.renderer.setSize( window.innerWidth, window.innerHeight );
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = SRGBColorSpace;
    document.body.appendChild( this.renderer.domElement );

    // scene

    this.scene = new Scene();

    // camera (for pointer lock controls, player creates own camera)

    this.camera = new PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );

    // controls

    this.controls = new PointerLockControls( this.camera, document.body );
    this.playerController = new PlayerController();

    // create player

    if (this.settings.mode=='drive') {
      this.player = new PlayerCar({
        scene: this.scene,
        renderer: this.renderer,
        controller: this.playerController,
        x: -this.roadWidth/2,
        z: 0
      });
    }
    else {
      this.player = new Player({
        scene: this.scene,
        renderer: this.renderer,
        controller: this.playerController,
        x: 0,
        z: 0
      });
    }

    // radio

    this.radio = null;

    /*----- post processing -----*/

    this.composer = new EffectComposer( this.renderer );

    // render pass
    this.composer.addPass(  new RenderPass( this.scene, this.player.camera ) );

    // anti aliasing
    const fxaa = new ShaderPass( FXAAShader );
    const pixelRatio = this.renderer.getPixelRatio();
    fxaa.material.uniforms[ 'resolution' ].value.x = 1 / ( window.innerWidth * pixelRatio );
    fxaa.material.uniforms[ 'resolution' ].value.y = 1 / ( window.innerHeight * pixelRatio );
    this.composer.addPass( fxaa );

    // bloom
    const bloomPass = new UnrealBloomPass( new Vector2( window.innerWidth, window.innerHeight ), 0, 0, 0 );
    if (this.environment.name=='night') {
      bloomPass.threshold = 0.8; // Very minimal bloom - only brightest lights
      bloomPass.strength = 0.5; // Almost no glow - realistic city night
      bloomPass.radius = 0.4;
    }
    else if (this.environment.name=='day') {
      bloomPass.threshold = 0;
      bloomPass.strength = 0.35;
      bloomPass.radius = 1;
    }
    this.composer.addPass( bloomPass );

    /*----- environment -----*/

    // sky and fog

    this.scene.background = this.assets.getTexture(this.environment.sky);

    // this.scene.environment = this.assets.getTexture(this.environment.environmentMap);
    
    this.scene.fog = new Fog(this.environment.fog.color, this.environment.fog.start, this.environment.fog.end);

    // lights

    const light_sun = new DirectionalLight( this.environment.sun.color, this.environment.sun.intensity );
    light_sun.castShadow = false;
    light_sun.position.x = this.environment.sun.x;
    light_sun.position.y = this.environment.sun.y;
    light_sun.position.z = this.environment.sun.z;
    this.scene.add( light_sun );
    this.scene.add( light_sun.target );

    const light_ambient = new AmbientLight( this.environment.ambient.color, this.environment.ambient.intensity );
    this.scene.add( light_ambient );

    /*----- generators -----*/

    this.cityBlockNoise = new Perlin(this.settings.worldSeed);
    this.cityBlockNoise.noiseDetail(8, 0.5);
    this.cityBlockNoiseFactor = 0.0017;//0.0017;

    this.generatorCityBlock = new Generator({
      camera: this.player.camera,
      cell_size: this.cityBlockSize+this.roadWidth,
      cell_count: 40,
      spawn_obj: GeneratorItem_CityBlock
    });

    this.cityLights = [];
    this.generatorCityLights = null;
    if (this.environment.cityLights) {
      // create lights
      for (let i=0; i<10; i++) {
        let light = new PointLight( 0x000000, 100, 2000 );
        light.decay = 1;
        let l = {
          light: light,
          free: true
        }
        this.scene.add(l.light);
        this.cityLights.push(l);
      }
      // create generator
      this.generatorCityLights = new Generator({
        camera: this.player.camera,
        cell_size: (this.cityBlockSize+this.roadWidth)*4,
        cell_count: 8,
        spawn_obj: GeneratorItem_CityLight
      });
    }

    this.generatorTraffic = new Generator({
      camera: this.player.camera,
      cell_size: this.cityBlockSize+this.roadWidth,
      cell_count: 12,
      debug: false,
      spawn_obj: GeneratorItem_Traffic
    });

    /*----- animate -----*/

    // time

    this.clock = new Clock();
    this.clockDelta = 0;

    // animate

    this.animate();

    /*----- event listeners -----*/

    window.addEventListener( 'resize', () => this.onWindowResize(), false );
    window.addEventListener( 'click', (event) => this.onClick(event), false );
    window.addEventListener( 'mousemove', (event) => this.onMouseMove(event), false );

    this.controls.addEventListener( 'lock', () => this.onControlsLock(), false );
    this.controls.addEventListener( 'unlock', () => this.onControlsUnlock(), false );

    // Initialize raycaster for project billboard interaction
    this.raycaster = new Raycaster();

    // Initialize proximity detector
    this.proximityDetector = new ProximityDetector();
    console.log('Game: Proximity detector initialized');

    // Initialize minimap
    this.minimap = new Minimap();
    console.log('Game: Minimap initialized');

    // Initialize billboard indicator manager
    this.billboardIndicatorManager = new BillboardIndicatorManager();
    console.log('Game: Billboard indicator manager initialized');

  }

  initAudio() {

    const self = this;

    if (!this.audioInitialized) {

      this.audioListener = new AudioListener();
      this.player.camera.add( this.audioListener );

      // music
      if ( this.settings.music == 1 ) {
        this.radio = new Radio({
          audioListener: this.audioListener,
          controller: this.playerController
        });
      }
      // sound effects
      if ( this.settings.soundFx == 1 ) {
        // traffic ambient
        const soundTrafficAmbient = new Audio( this.audioListener );
        this.audioLoader.load( 'assets/sounds/traffic_ambient.wav', function( buffer ) {
          soundTrafficAmbient.setBuffer( buffer );
          soundTrafficAmbient.setLoop(true);
          soundTrafficAmbient.setVolume(1);
          soundTrafficAmbient.play();
        });
        // car sounds
        if ( this.settings.mode == 'drive' ) {
          const soundCarAmbient = new Audio( this.audioListener );
          this.audioLoader.load( 'assets/sounds/car_ambient.wav', function( buffer ) {
            soundCarAmbient.setBuffer( buffer );
            soundCarAmbient.setLoop(true);
            soundCarAmbient.setVolume(1);
            soundCarAmbient.play();
          });
          const soundCarWind = new Audio( this.audioListener );
          this.audioLoader.load( 'assets/sounds/car_wind.wav', function( buffer ) {
            soundCarWind.setBuffer( buffer );
            soundCarWind.setLoop(true);
            soundCarWind.setVolume(0);
            soundCarWind.play();
            self.player.soundWind = soundCarWind;
          });
          const soundCarStress = new Audio( this.audioListener );
          this.audioLoader.load( 'assets/sounds/car_stress.wav', function( buffer ) {
            soundCarStress.setBuffer( buffer );
            soundCarStress.setLoop(true);
            soundCarStress.setVolume(0);
            soundCarStress.play();
            self.player.soundStress = soundCarStress;
          });
          const soundCarChimeUp = new Audio( this.audioListener );
          this.audioLoader.load( 'assets/sounds/chime_up.wav', function( buffer ) {
            soundCarChimeUp.setBuffer( buffer );
            soundCarChimeUp.setLoop(false);
            soundCarChimeUp.setVolume(1);
            self.player.soundChimeUp = soundCarChimeUp;
          });
          const soundCarChimeDown = new Audio( this.audioListener );
          this.audioLoader.load( 'assets/sounds/chime_down.wav', function( buffer ) {
            soundCarChimeDown.setBuffer( buffer );
            soundCarChimeDown.setLoop(false);
            soundCarChimeDown.setVolume(1);
            self.player.soundChimeDown = soundCarChimeDown;
          });
          const soundCarCrash = new Audio( this.audioListener );
          this.audioLoader.load( 'assets/sounds/crash.wav', function( buffer ) {
            soundCarCrash.setBuffer( buffer );
            soundCarCrash.setLoop(false);
            soundCarCrash.setVolume(1);
            self.player.soundCrash = soundCarCrash;
          });
        }
        // city sounds
        else {
          const soundCityAmbient = new Audio( this.audioListener );
          this.audioLoader.load( 'assets/sounds/city_ambient.wav', function( buffer ) {
            soundCityAmbient.setBuffer( buffer );
            soundCityAmbient.setLoop(true);
            soundCityAmbient.setVolume(0);
            soundCityAmbient.play();
            self.player.soundCityAmbient = soundCityAmbient;
          });
          const soundWind = new Audio( this.audioListener );
          this.audioLoader.load( 'assets/sounds/car_wind.wav', function( buffer ) {
            soundWind.setBuffer( buffer );
            soundWind.setLoop(true);
            soundWind.setVolume(0);
            soundWind.play();
            self.player.soundWind = soundWind;
          });
        }
      }

      this.audioInitialized = true;

    }

  }

  animate(now) {

    // animate

    requestAnimationFrame(() => this.animate());
    let delta = this.clock.getDelta(); // seconds
    this.clockDelta += delta;

    // fade in

    if (this.canvasOpacity<1) {
      // canvas
      this.canvasOpacity += this.clockDelta*0.005;
      this.canvas.style.opacity = this.canvasOpacity;
      // audio
      this.masterVolume += this.clockDelta*0.005;
    }

    // master volume

    if (this.playerController.key_plus) {
      this.userMasterVolume = Math.min( this.userMasterVolume+0.02, 1 );
    }
    if (this.playerController.key_minus) {
      this.userMasterVolume = Math.max( this.userMasterVolume-0.02, 0 );
    }

    if (this.audioListener) {
      this.audioListener.setMasterVolume(this.masterVolume * this.userMasterVolume);
    }

    // update

    this.player.update();
    if (this.radio) this.radio.update();
    this.playerController.update();

    this.generatorCityBlock.update();
    if (this.generatorCityLights!==null) this.generatorCityLights.update();
    this.generatorTraffic.update();

    // Update proximity detector with player position
    if (this.proximityDetector && this.player && this.player.body) {
      this.proximityDetector.update(this.player.body.position);
    }

    // Update minimap with player position and camera rotation (mouse look)
    if (this.minimap && this.player && this.player.body) {
      const playerRotation = this.player.camera ? this.player.camera.rotation.y : 0;
      this.minimap.update(this.player.body.position, playerRotation);
    }

    // Update billboard indicators
    if (this.billboardIndicatorManager && this.player && this.player.body) {
      this.billboardIndicatorManager.update(delta, this.player.body.position);
    }

    // render

    this.composer.render();
    // this.renderer.render(this.scene, this.player.camera);

    // start collision checking
    if (!this.collider.enabled) this.collider.enabled = true;

  }

  getEnvironment(id) {

    const environments = {
      night: {
        name: 'night',
        sky: 'sky_night',
        environmentMap: 'env_night',
        cityLights: true,
        windowLights: true,
        spotLights: true,
        fog: {
          color: 0x0a0e1a, // Dark blue-grey fog - realistic night
          start: 0,
          end: 2700
        },
        sun: {
          color: 0xc0d0ff, // Cool moonlight - natural night lighting
          intensity: 0.05, // Very subtle moonlight
          x: 1,
          y: 0.5,
          z: 0.25,
        },
        ambient: {
          color: 0x1a2030, // Cool dark blue ambient - realistic night
          intensity: 0.25, // Low ambient for realistic darkness
        }
      },
      day: {
        name: 'day',
        sky: 'sky_day',
        environmentMap: 'env_day',
        cityLights: false,
        windowLights: false,
        spotLights: false,
        fog: {
          color: 0xaf6a3b,
          start: -500,
          end: 2700
        },
        sun: {
          color: 0xffa25e,
          intensity: 2,
          x: 1,
          y: 0.2,
          z: 0.65,
        },
        ambient: {
          color: 0x825233,
          intensity: 0.65,
        }
      }
    };

    return environments[id];

  }

  // event listener callbacks

  onWindowResize() {

    const width = window.innerWidth;
    const height = window.innerHeight;
  
    this.renderer.setSize( width, height );
    this.composer.setSize( width, height );

    this.player.onWindowResize();
  
  }

  onEnterClick() {
    this.init();
    this.initAudio();
    this.blocker.style.backgroundColor = '#25004bb9';
    this.blocker.classList.add('hide');
    this.controls.lock();
  }
  onControlsLock() {
    this.playerController.enabled = true;
    // Show crosshair
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.style.display = 'block';
    // Show minimap
    if (this.minimap) this.minimap.show();
  }
  onControlsUnlock() {
    this.playerController.enabled = false;
    if (this.uiOnUnfocus) {
      this.blocker.classList.remove('hide');
    }
    // Hide crosshair
    const crosshair = document.getElementById('crosshair');
    if (crosshair) crosshair.style.display = 'none';
  }

  onMouseMove(event) {
    // Update mouse position for raycasting
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  onClick(event) {
    // Only process clicks when controls are locked (in-game)
    if (!this.controls.isLocked || !this.raycaster || !this.initialized) {
      return;
    }

    // Update raycaster with camera and center of screen (crosshair position)
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.player.camera);

    // Check for intersections with interactive project billboards
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, false);

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      
      // Check if it's a Monad project billboard
      if (clickedObject.userData && clickedObject.userData.isMonadProject) {
        const project = clickedObject.userData.project;
        const distance = Math.round(intersects[0].distance);
        
        console.log('🎯 Clicked Monad project:', project.name, '@ ' + distance + 'm');
        
        // Visual feedback
        const resourcesPanel = document.getElementById('resources');
        if (resourcesPanel) {
          resourcesPanel.innerHTML = `>> <span class="g1">OPENING: ${project.name}</span><br>> Distance: ${distance}m`;
          setTimeout(() => {
            // Proximity detector will take over again
            if (this.proximityDetector) {
              this.proximityDetector.frameCounter = 0; // Force immediate update
            }
          }, 2000);
        }
        
        // Open project URL in new tab
        if (project.url && project.url !== '') {
          window.open(project.url, '_blank');
        } else if (project.twitter && project.twitter !== '') {
          // Fallback to Twitter if no URL
          window.open(project.twitter, '_blank');
        }
      }
    }
  }

}