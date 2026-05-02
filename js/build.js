import { marked } from 'marked';

// Helper function to safely render markdown to HTML
function renderMarkdown(text) {
  if (!text) return '';
  try {
    return marked.parse(text);
  } catch (error) {
    console.error('Error parsing markdown:', error);
    return text; // Fallback to plain text if parsing fails
  }
}

class InputManager {
  constructor() {
    this.keys = {};
    this.callbacks = [];
    this.callbacks_i = 0;
    const keyMap = /* @__PURE__ */ new Map();
    const setKey = (keyName, pressed) => {
      const keyState = this.keys[keyName];
      keyState.justPressed = pressed && !keyState.down;
      keyState.down = pressed;
      keyState.justReleased = !keyState.down && !pressed && !keyState.justReleased;
      if (keyState.justPressed && this.callbacks[keyName].length) {
        for (let i in this.callbacks[keyName]) {
          if (this.callbacks[keyName][i].actionType == "justPressed") {
            this.callbacks[keyName][i].callback();
            if (this.callbacks[keyName][i].maxCalls) {
              this.callbacks[keyName][i].totalCalls++;
              if (this.callbacks[keyName][i].totalCalls >= this.callbacks[keyName][i].maxCalls) {
                this.callbacks[keyName].splice(i, 1);
              }
            }
          }
        }
      }
    };
    const addKey = (keyCode, name) => {
      this.keys[name] = { down: false, justPressed: false, justReleased: false, clock: new THREE.Clock() };
      this.callbacks[name] = [];
      keyMap.set(keyCode, name);
    };
    const setKeyFromKeyCode = (keyCode, pressed) => {
      const keyName = keyMap.get(keyCode);
      if (!keyName) {
        return;
      }
      setKey(keyName, pressed);
    };
    this.addKeyCallback = (keyName, actionType, callback, calls = false) => {
      this.callbacks_i++;
      this.callbacks[keyName][this.callbacks_i] = {
        "actionType": actionType,
        "callback": callback,
        "maxCalls": calls,
        "totalCalls": 0
      };
      return this.callbacks_i;
    };
    this.removeKeyCallback = (keyName, callback_i) => {
      if (this.callbacks[keyName][callback_i]) {
        this.callbacks[keyName].splice(callback_i, 1);
      }
    };
    addKey(40, "down");
    addKey(17, "down");
    addKey(38, "space");
    addKey(32, "space");
    addKey(81, "debug_speedup");
    // Event listeners for keyboard support
    window.addEventListener('keydown', (e) => setKeyFromKeyCode(e.keyCode, true));
    window.addEventListener('keyup', (e) => setKeyFromKeyCode(e.keyCode, false));

    // Mobile touch support variables
    this.touchStartTime = 0;
    this.isDucking = false;
    this.touchStartHandler = null;
    this.touchEndHandler = null;

    // Create touch event handlers
    this.touchStartHandler = (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        this.touchStartTime = Date.now();
        setKeyFromKeyCode(32, true); // Simulate spacebar (jump)
      } else if (e.touches.length === 2) {
        this.isDucking = true;
        setKeyFromKeyCode(40, true); // Simulate down arrow (duck)
      }
    };

    this.touchEndHandler = (e) => {
      e.preventDefault();
      if (this.isDucking) {
        setKeyFromKeyCode(40, false); // Release ducking
        this.isDucking = false;
      } else {
        setKeyFromKeyCode(32, false); // Release jump
      }
    };
  }

  enableTouchControls() {
    if (this.touchStartHandler && this.touchEndHandler) {
      window.addEventListener('touchstart', this.touchStartHandler);
      window.addEventListener('touchend', this.touchEndHandler);
    }
  }

  disableTouchControls() {
    if (this.touchStartHandler && this.touchEndHandler) {
      window.removeEventListener('touchstart', this.touchStartHandler);
      window.removeEventListener('touchend', this.touchEndHandler);
      // Reset touch state
      this.isDucking = false;
      this.touchStartTime = 0;
    }
  }

  update() {
    for (const keyState of Object.values(this.keys)) {
      if (keyState.justPressed) {
        keyState.clock.start();
        keyState.justPressed = false;
      }
      if (keyState.justReleased) {
        keyState.clock.stop();
        keyState.clock.elapsedTime = 0;
        keyState.justReleased = false;
      }
    }
  }
}
class AudioManager {
  constructor() {
    this.base_path = config.base_path + "sound/";
    this.sounds = {
      "score": new Howl({
        src: [this.base_path + "Pickup_Coin103.wav"],
        preload: true,
        autoplay: false,
        loop: false,
        volume: 0.3
      }),
      "highest_score": new Howl({
        src: [this.base_path + "Powerup33.wav"],
        preload: true,
        autoplay: false,
        loop: false,
        volume: 0.4
      }),
      "jump": new Howl({
        src: [this.base_path + "Jump24.wav"],
        preload: true,
        autoplay: false,
        loop: false,
        volume: 0.15
      }),
      "killed": new Howl({
        src: [this.base_path + "Randomize62.wav"],
        preload: true,
        autoplay: false,
        loop: false,
        volume: 0.15
      }),
      "bg": new Howl({
        src: [this.base_path + "ingame/Reloaded Games - Music.ogg"],
        preload: true,
        autoplay: false,
        loop: true,
        volume: 0.75
      })
    };
  }
  autoplay() {
    if (!this.sounds["bg"].playing()) {
      this.play("bg");
    }
  }
  play(what) {
    this.sounds[what].stop();
    this.sounds[what].play();
  }
  stop(what) {
    this.sounds[what].stop();
  }
  pause(what) {
    this.sounds[what].pause();
  }
  resume(what) {
    this.sounds[what].play();
  }
}
class EnemyPool {
  constructor() {
    this.items = [];
    this.keys = [];
  }
  addItem(item) {
    this.items.push(item);
    this.keys.push(this.items.length - 1);
  }
  getItem(k) {
    return this.items[k];
  }
  getRandomKey() {
    if (!this.keys.length) {
      return false;
    }
    let i = Math.floor(Math.random() * this.keys.length);
    let k = this.keys.splice(i, 1)[0];
    return k;
  }
  returnKey(k) {
    this.keys.push(k);
  }
  reset() {
    this.items = [];
    this.keys = [];
  }
}
class EnemyManager {
  constructor() {
    this.pool = new EnemyPool();
    this.buffer = [];
    this.clock = new THREE.Clock();
    this.config = {
      "enable_collisions": true,
      "max_amount": {
        "pool": {
          "cactus": 50,
          "ptero": 15
        },
        "buffer": 10
      },
      // max ammount of enemy groups
      "vel": 0,
      // overall speed of all enemies and other moving elements in-game
      "initial_z": -50,
      "remove_z": 25,
      // z offset when enemy will be removed
      "z_distance": {
        "cactus": 20,
        "ptero": 40
      },
      // z distance between enemies
      "z_distance_rand": {
        "cactus": [0.9, 2.5],
        "ptero": [0.7, 1.5]
      },
      // z distance random rescale range
      "rescale_rand": {
        "cactus": [0.6, 1.2]
      },
      // random rescale range
      "y_random_rotate": {
        "cactus": [-60, 60]
      },
      "x_random_range": {
        "cactus": [-0.5, 0.5]
      },
      "chance_to_spawn_tail": [100, 25],
      // tails spawn chances
      "tail_rescale_rand": [[0.6, 0.9], [0.4, 0.7]],
      // tails rescale rand
      "ptero_anim_speed": 0.1,
      // lower is faster
      "ptero_y_rand": [0, 1.3, 3.5],
      // random ptero y positions
      "ptero_z_speedup": -35
    };
    this.cache = {
      "cactus": {
        "material": [],
        "geometry": []
      },
      "ptero": {
        "material": [],
        "geometry": []
      }
    };
  }
  hasDuplicates(array) {
    return new Set(array).size !== array.length;
  }
  async init() {
    this.cache.cactus = {
      "geometry": await load_manager.get_mesh_geometry("cactus"),
      "material": await load_manager.get_mesh_material("cactus")
    };
    this.cache.ptero = {
      "geometry": await load_manager.get_mesh_geometry("ptero"),
      "material": await load_manager.get_mesh_material("ptero")
    };
    if (!this.pool.items.length) {
      for (let i = 0; i < this.config.max_amount.pool.cactus; i++) {
        this.pool.addItem(this.createEnemy("cactus"));
      }
    }
    for (let i = 0; i < this.config.max_amount.buffer; i++) {
      this.buffer.push(this.spawn());
    }
  }
  createEnemy(type = "cactus", tail = false, tail_number = 0) {
    let rand = Math.floor(Math.random() * load_manager.assets[type].mesh.length);
    let mesh = new THREE.Mesh(
      this.cache[type].geometry[rand],
      this.cache[type].material[rand]
    );
    mesh.enemy_type = type;
    mesh.castShadow = true;
    if (type == "cactus") {
      mesh.rotation.y = -(Math.PI / 2);
    } else {
      mesh.current_frame = rand;
    }
    let enemiesGroup = [mesh];
    if (type == "cactus") {
      if (tail) {
        return enemiesGroup[0];
      } else {
        if (Math.floor(Math.random() * 100) < this.config.chance_to_spawn_tail[0]) {
          enemiesGroup.push(this.createEnemy("cactus", true, 0));
          if (Math.floor(Math.random() * 100) < this.config.chance_to_spawn_tail[1]) {
            enemiesGroup.push(this.createEnemy("cactus", true, 1));
          }
        }
      }
    }
    for (let e = 0; e < enemiesGroup.length; e++) {
      enemiesGroup[e].visible = false;
      scene.add(enemiesGroup[e]);
    }
    return enemiesGroup;
  }
  spawn() {
    let rand = this.pool.getRandomKey();
    if (rand !== false) {
      let enemiesGroup = this.pool.getItem(rand);
      for (let i = 0; i < enemiesGroup.length; i++) {
        enemiesGroup[i].position.y = nature.cache.ground.box.max.y + -nature.cache.ground.box.min.y - 2.5;
        if (enemiesGroup[i].enemy_type == "cactus") {
          let rescaleRand = 1;
          if (i > 0) {
            rescaleRand = this.random(this.config.tail_rescale_rand[i - 1][0], this.config.tail_rescale_rand[i - 1][1]);
          } else {
            rescaleRand = this.get_rr("cactus");
          }
          enemiesGroup[i].scale.set(rescaleRand, rescaleRand, rescaleRand);
          enemiesGroup[i].position.x = this.random(
            this.config.x_random_range.cactus[1],
            this.config.x_random_range.cactus[0]
          );
          let yRandomRotate = this.random(this.config.y_random_rotate.cactus[0], this.config.y_random_rotate.cactus[1]);
          enemiesGroup[i].rotateY(THREE.Math.degToRad(yRandomRotate));
          let zRand = this.get_z("cactus");
          if (i > 0) {
            if (i == 1) {
              enemiesGroup[i].position.z = -(-enemiesGroup[i - 1].position.z + rescaleRand * 1.7);
            } else {
              enemiesGroup[i].position.z = -(-enemiesGroup[i - 1].position.z + rescaleRand * 1.9);
            }
          } else {
            if (!this.buffer.length) {
              enemiesGroup[i].position.z = this.config.initial_z;
            } else {
              if (this.pool.getItem(this.buffer[this.buffer.indexOf(this.buffer.leader)])[0].enemy_type == "ptero") {
                let last = this.pool.getItem(this.buffer.leader);
                zRand = this.get_z("ptero");
                enemiesGroup[i].position.z = -(-last[last.length - 1].position.z + zRand);
              } else {
                let last = this.pool.getItem(this.buffer.leader);
                enemiesGroup[i].position.z = -(-last[last.length - 1].position.z + zRand);
              }
            }
          }
        } else {
          enemiesGroup[0].position.x = 0;
          enemiesGroup[0].position.y = this.get_ptero_y();
          let zRand = this.get_z("ptero");
          if (this.buffer.length) {
            let last = this.pool.getItem(this.buffer.leader);
            enemiesGroup[i].position.z = -(-last[last.length - 1].position.z + zRand);
          } else {
            enemiesGroup[0].position.z = -(zRand * 2);
          }
        }
        enemiesGroup[i].visible = true;
      }
      this.buffer.leader = rand;
      return rand;
    }
  }
  despawn(k = false) {
    let key = null;
    if (k !== false) {
      key = this.buffer[this.buffer.indexOf(k)];
    } else {
      key = this.buffer[0];
    }
    let enemiesGroup = this.pool.getItem(key);
    for (let e = 0; e < enemiesGroup.length; e++) {
      enemiesGroup[e].position.z = this.config.remove_z * 2;
      enemiesGroup[e].visible = false;
    }
    this.pool.returnKey(key);
  }
  move(timeDelta) {
    for (let i = 0; i < this.buffer.length; i++) {
      let e = this.pool.getItem(this.buffer[i]);
      if (e[0].position.z > this.config.remove_z) {
        let newEnemy = this.spawn();
        this.despawn(this.buffer[i]);
        this.buffer[i] = newEnemy;
        continue;
      }
      for (let j = 0; j < e.length; j++) {
        if (e[j].enemy_type == "ptero") {
          if (e[j].position.z > this.config.ptero_z_speedup) {
            e[j].position.z += this.config.vel * 1.7 * timeDelta;
          } else {
            e[j].position.z += this.config.vel * timeDelta;
          }
        } else {
          e[j].position.z += this.config.vel * timeDelta;
        }
        if (this.config.enable_collisions) {
          let eBox = this.box3 = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
          eBox.setFromObject(e[j]);
          let pBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
          pBox.setFromObject(player.collisionBox);
          if (eBox.intersectsBox(pBox) && e[j].visible) {
            game.stop();
            return;
          }
        }
      }
    }
  }
  reset() {
    for (let i = 0; i < this.buffer.length; i++) {
      this.despawn();
    }
    for (let i = 0; i < this.pool.items.length; i++) {
      for (let j = 0; j < this.pool.items[i].length; j++) {
        scene.remove(this.pool.items[i][j]);
      }
    }
    this.pool.reset();
    this.buffer = [];
    delete this.buffer.leader;
  }
  spawnPteros() {
    for (let i = 0; i < this.config.max_amount.pool.ptero; i++) {
      this.pool.addItem(this.createEnemy("ptero"));
    }
  }
  random(from, to, float = true) {
    if (float) {
      return (Math.random() * (to - from) + from).toFixed(4);
    } else {
      return Math.floor(Math.random() * to) + from;
    }
  }
  get_rr(type) {
    return this.random(this.config.rescale_rand[type][0], this.config.rescale_rand[type][1]);
  }
  get_z(type) {
    let zrr = this.random(this.config.z_distance_rand[type][0], this.config.z_distance_rand[type][1]);
    return this.config.z_distance[type] * zrr;
  }
  get_ptero_y() {
    return nature.cache.ground.box.max.y + -nature.cache.ground.box.min.y - 2.5 + this.config.ptero_y_rand[this.random(0, this.config.ptero_y_rand.length, false)];
  }
  increase_velocity(add = 1, init = false) {
    if (this.config.vel >= 35 && !init) {
      return;
    }
    if (init) {
      this.config.vel = add;
    } else {
      this.config.vel += add;
    }
    if (this.config.vel < 10) {
      player.setVelocity(15);
      player.setVelocity(1.1, true);
      player.setGravity(37);
      player.setGravity(30, true);
      logs.log("Speed level 1");
    } else if (this.config.vel >= 10 && this.config.vel < 20 && (player.jump.vel == 15 || init)) {
      player.setVelocity(19);
      player.setVelocity(1.1, true);
      player.setGravity(60);
      player.setGravity(40, true);
      dynoDustEmitter.removeAllParticles();
      dynoDustEmitter.stopEmit();
      dynoDustEmitter = nebulaCreateDynoDustEmitter(7);
      nebulaSystem.addEmitter(dynoDustEmitter);
      logs.log("Speed level 2");
    } else if (this.config.vel >= 20 && this.config.vel < 30 && (player.jump.vel == 19 || init)) {
      player.setVelocity(25);
      player.setVelocity(1.3, true);
      player.setGravity(100);
      player.setGravity(70, true);
      dynoDustEmitter.removeAllParticles();
      dynoDustEmitter.stopEmit();
      dynoDustEmitter = nebulaCreateDynoDustEmitter(10);
      nebulaSystem.addEmitter(dynoDustEmitter);
      logs.log("Speed level 3");
    } else if (this.config.vel >= 30 && (player.jump.vel == 25 || init)) {
      player.setVelocity(30);
      player.setVelocity(1.5, true);
      player.setGravity(150);
      player.setGravity(70, true);
      dynoDustEmitter.removeAllParticles();
      dynoDustEmitter.stopEmit();
      dynoDustEmitter.dead = true;
      logs.log("Speed level 4");
    }
  }
  pteroNextFrame() {
    for (let i = 0; i < this.buffer.length; i++) {
      let e = this.pool.getItem(this.buffer[i])[0];
      if (e.enemy_type == "ptero") {
        e.current_frame++;
        if (e.current_frame > this.cache.ptero.geometry.length - 1) {
          e.current_frame = 0;
        }
        e.geometry = this.cache.ptero.geometry[e.current_frame];
      }
    }
  }
  update(timeDelta) {
    this.move(timeDelta);
    if (this.clock.getElapsedTime() > this.config.ptero_anim_speed) {
      this.clock.elapsedTime = 0;
      this.pteroNextFrame();
    }
  }
}
class ScoreManager {
  constructor() {
    this.score = 0;
    this.highest_score = 0;
    this.highest_alert = false;
    this.zero_padding = 5;
    this.config = {};
    this.timer = null;
    this.add_vel = 10;
    this.step = 100;
    this.is_flashing = false;
    this.lvl = 0;
    this.clock = new THREE.Clock();
    this.last_flash_score = 0;
    this.recent_scores = [];
    this.max_recent_scores = 3;
    Number.prototype.pad = function (size) {
      var s = String(this);
      while (s.length < (size || 2)) {
        s = "0" + s;
      }
      return s;
    };
    {
      this.canvas = document.createElement("canvas");
      this.canvas.id = "score-counter";
      this.canvas.width = 450;
      this.canvas.height = 60;
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext("2d");
    }
    if (!localStorage.getItem("highest_score___GLITCH_FIX")) {
      localStorage.setItem("highest_score", 0);
      localStorage.setItem("highest_score___GLITCH_FIX", true);
    }
    this.loadRecentScores();
  }
  set(points) {
    this.score = points;
    this.highest_score = localStorage.getItem("highest_score");
    if (this.highest_score < 25) {
      this.highest_alert = true;
    } else {
      this.highest_alert = false;
    }
  }
  add(points) {
    this.score += points;
    if (this.score > this.highest_score) {
      localStorage.setItem("highest_score", this.score);
      this.highest_score = this.score;
      if (!this.highest_alert) {
        audio.play("highest_score");
        this.highest_alert = true;
      }
    }
    if (this.score != 0 && Math.trunc(this.score) % this.step == 0 && Math.trunc(this.score) != this.last_flash_score) {
      this.last_flash_score = Math.trunc(this.score);
      this.flash();
    }
  }
  flash() {
    this.clock.stop();
    this.clock.elapsedTime = 0;
    this.clock.start();
    this.is_flashing = true;
    audio.play("score");
    enemy.increase_velocity();
    if (this.score >= 400 && this.lvl == 0) {
      this.lvl = 1;
      enemy.spawnPteros();
      logs.log("Pterodactyls started to spawn");
    } else if (this.score >= 1e3 && this.lvl == 1) {
      this.lvl = 2;
      this.add_vel = 20;
      logs.log("Score level 2");
    } else if (this.score >= 3e3 && this.lvl == 2) {
      this.lvl = 3;
      this.add_vel = 40;
      logs.log("Score level 3");
    }
  }
  reset() {
    this.clock = new THREE.Clock();
    this.lvl = 0;
    this.add_vel = 10;
  }

  loadRecentScores() {
    const stored = localStorage.getItem("recent_scores");
    if (stored) {
      try {
        this.recent_scores = JSON.parse(stored);
        // Ensure we don't exceed max length
        if (this.recent_scores.length > this.max_recent_scores) {
          this.recent_scores = this.recent_scores.slice(-this.max_recent_scores);
          this.saveRecentScores();
        }
        // Update display after loading
        this.updateRecentScoresDisplay();
      } catch (e) {
        this.recent_scores = [];
      }
    }
  }

  saveRecentScores() {
    localStorage.setItem("recent_scores", JSON.stringify(this.recent_scores));
  }

  addRecentScore(finalScore, timePlayed) {
    const scoreEntry = {
      score: Math.floor(finalScore),
      time: Math.floor(timePlayed),
      date: Date.now()
    };

    this.recent_scores.push(scoreEntry);

    // Keep only the most recent scores
    if (this.recent_scores.length > this.max_recent_scores) {
      this.recent_scores = this.recent_scores.slice(-this.max_recent_scores);
    }

    this.saveRecentScores();
    this.updateRecentScoresDisplay();
  }

  updateRecentScoresDisplay() {
    const container = document.getElementById('recent-scores-list');
    if (!container) return;

    // Show last 3 scores (most recent first)
    const recentToShow = this.recent_scores.slice(-3).reverse();

    container.innerHTML = recentToShow.map((entry, index) => {
      const isLatest = index === 0;

      return `
        <div class="recent-score-item ${isLatest ? 'latest-score' : ''}">
          <p class="score-value">Score: ${entry.score}</p>
        </div>
      `;
    }).join('');
  }

  getRecentScoresStats() {
    if (this.recent_scores.length === 0) return null;

    const scores = this.recent_scores.map(entry => entry.score);

    return {
      count: scores.length,
      scores: scores
    };
  }
  update(timeDelta) {
    this.add(this.add_vel * timeDelta);
    let text = "";
    if (this.highest_score > 9999) {
      text = "HI " + (this.highest_score / 1e3).toFixed(1) + "K";
    } else {
      text = "HI " + Math.trunc(this.highest_score).pad(this.zero_padding);
    }
    if (this.is_flashing) {
      if (Math.trunc(this.clock.getElapsedTime() * 4) % 2) {
        text = text + " " + Math.trunc(this.score).pad(this.zero_padding);
        if (this.clock.getElapsedTime() > 1) {
          this.is_flashing = false;
        }
      }
    } else {
      text = text + " " + Math.trunc(this.score).pad(this.zero_padding);
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.font = '28px "Press Start 2P"';
    this.ctx.fillStyle = "rgba(106,133,145,1)";
    this.ctx.fillText(text, 0, 60);
  }
}
const scene = new THREE.Scene();
if (config.renderer.fog) {
  const color = 15184465;
  const near = 1;
  const far = 175;
  scene.fog = new THREE.Fog(color, near, far);
}
const camera = new THREE.PerspectiveCamera(
  config.camera.fov,
  config.camera.aspect,
  config.camera.near,
  config.camera.far
);
const clock = new THREE.Clock();
let input = new InputManager();
let audio = new AudioManager();
let enemy = new EnemyManager();
let score = new ScoreManager();
const renderer = new THREE.WebGLRenderer({
  antialias: config.renderer.antialias,
  alpha: false,
  powerPreference: "high-performance",
  depth: true
});
scene.background = new THREE.Color(15184465);
renderer.setSize(config.renderer.width * config.renderer.render_at, config.renderer.height * config.renderer.render_at);
renderer.setPixelRatio(window.devicePixelRatio);
if (config.renderer.shadows) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = config.renderer.shadows_type;
}
if (config.renderer.toneMapping) {
  renderer.toneMapping = THREE.Uncharted2ToneMapping;
}
renderer.domElement.id = "three-canvas";
document.body.appendChild(renderer.domElement);
if (config.renderer.interval !== false && config.renderer.fps_counter === true) {
  var fc = document.createElement("div");
  fc.id = "fps-counter";
  document.body.appendChild(fc);
}
if (config.renderer.postprocessing.enable) {
  var composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  if (config.renderer.postprocessing.sao) {
    let saoPass = new THREE.SAOPass(scene, camera, false, true);
    saoPass.params.saoBias = 1;
    saoPass.params.saoIntensity = 8e-3;
    saoPass.params.saoScale = 10;
    saoPass.params.saoKernelRadius = 10;
    saoPass.params.saoMinResolution = 0;
    saoPass.params.saoBlur = true;
    saoPass.params.saoBlurRadius = 3;
    saoPass.params.saoBlurStdDev = 42.3;
    saoPass.params.saoBlurDepthCutoff = 0.1;
    composer.addPass(saoPass);
  }
}
if (config.camera.controls) {
  var controls = new THREE.MapControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 5;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI / 2;
}
camera.position.x = 7.37041093612718;
camera.position.y = 3.428590611619372;
camera.position.z = 22.609984741761778;
camera.rotation.x = -0.2521795322818087;
camera.rotation.y = 0.5626175577081858;
camera.rotation.z = 0.1365832725087437;
if (config.camera.controls) {
  controls.target.set(-1.2946982583264495, -30793822864709634e-34, 9.30358864783445);
  controls.update();
}
window.addEventListener("resize", onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
let ALight = new THREE.AmbientLight(4210752, 2.4);
scene.add(ALight);
let DLight = new THREE.DirectionalLight(16777215, 0.5);
let DLightTargetObject = new THREE.Object3D();
DLight.position.set(50, 30, -30);
DLight.target = DLightTargetObject;
DLightTargetObject.position.set(-65, -25, -50);
DLight.castShadow = config.renderer.shadows;
DLight.shadow.radius = 1;
DLight.shadow.mapSize.width = 1024 * 3;
DLight.shadow.mapSize.height = 1024 * 3;
DLight.shadow.camera.scale.y = 10;
DLight.shadow.camera.scale.x = 20;
DLight.shadow.camera.near = 0;
DLight.shadow.camera.far = 200;
scene.add(DLight);
scene.add(DLightTargetObject);
if (config.camera.helper) {
  scene.add(new THREE.CameraHelper(DLight.shadow.camera));
}
const nebulaSystem = new Nebula.default();
function nebulaCreateDynoDustEmitter(spd = 5) {
  const dynoDustEmitter2 = new Nebula.Emitter();
  dynoDustEmitter2.rate = new Nebula.Rate(
    new Nebula.Span(1, 2),
    new Nebula.Span(0.1, 0.25)
  );
  dynoDustEmitter2.addInitializer(new Nebula.Mass(10));
  dynoDustEmitter2.addInitializer(new Nebula.Radius(0.1));
  dynoDustEmitter2.addInitializer(new Nebula.Life(1, 3));
  let ddustGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  let ddustMaterial = new THREE.MeshLambertMaterial({
    color: "#E7B251"
    //E7B251
  });
  dynoDustEmitter2.addInitializer(new Nebula.Body(new THREE.Mesh(ddustGeometry, ddustMaterial)));
  let ddustRadVelB = new Nebula.RadialVelocity(spd, new Nebula.Vector3D(0, 15, 20), 40);
  dynoDustEmitter2.addInitializer(ddustRadVelB);
  dynoDustEmitter2.addBehaviour(new Nebula.Rotate("random", "random"));
  dynoDustEmitter2.addBehaviour(new Nebula.Scale(2, 0.1));
  let ddZone = new Nebula.BoxZone(3, 2, 25);
  ddZone.max = 10;
  dynoDustEmitter2.addBehaviour(new Nebula.CrossZone(ddZone, "bound"));
  function setP(x, y, z) {
    dynoDustEmitter2.position.x = x;
    dynoDustEmitter2.position.y = y;
    dynoDustEmitter2.position.z = z;
    ddZone.x = x;
    ddZone.y = y;
    ddZone.z = z;
  }
  setP(0, -1.1, 15.5);
  dynoDustEmitter2.emit();
  return dynoDustEmitter2;
}
let dynoDustEmitter = nebulaCreateDynoDustEmitter(4);
nebulaSystem.addEmitter(dynoDustEmitter);
nebulaSystem.addRenderer(new Nebula.MeshRenderer(scene, THREE));
class LogManager {
  constructor() {
    this.is_active = false;
  }
  enable() {
    this.is_active = true;
  }
  disable() {
    this.is_active = false;
  }
  // levels are
  // 0 - info
  // 1 - warning
  // 2 - fatal
  log(message, level = 0) {
    if (level == 0)
      console.log("[INFO] " + message);
    else if (level == 1)
      console.log("[WARNING] " + message);
    else if (level == 2)
      console.log(["[FATAL] " + message]);
  }
}
let logs = new LogManager();
if (config.logs) {
  logs.enable();
}
class PlayerManager {
  constructor() {
    this.frames = null;
    this.frames_band = null;
    this.frames_death = null;
    this.frame = null;
    this.collisionBox = null;
    this.currentFrame = 0;
    this.clock = new THREE.Clock();
    this.anim_speed = 0.1;
    this.block_fall_fast = false;
    this.jump = {
      "is_active": false,
      "vel": 15,
      "gravity": -37,
      "boost": {
        "vel": 1.1,
        // mult
        "gravity": -30
        // new g
      }
    };
  }
  init() {
    for (let i in this.frames) {
      this.frames[i].position.y = nature.cache.ground.box.max.y + 0.05;
      this.frames[i].position.z = 15;
      this.frames[i].rotation.y = Math.PI / 2;
      this.frames[i].init_y = this.frames[i].position.y;
    }
    for (let i in this.frames_band) {
      this.frames_band[i].position.y = nature.cache.ground.box.max.y + 0.05;
      this.frames_band[i].position.z = 15;
      this.frames_band[i].rotation.y = Math.PI / 2;
      this.frames_band[i].init_y = this.frames_band[i].position.y;
    }
    for (let i in this.frames_death) {
      this.frames_death[i].position.y = nature.cache.ground.box.max.y + 0.05;
      this.frames_death[i].position.z = 15;
      this.frames_death[i].rotation.y = Math.PI / 2;
    }
  }
  getVelocity(boost = false) {
    if (boost) {
      return this.jump.boost.vel;
    } else {
      return this.jump.vel;
    }
  }
  setVelocity(v = 15, boost = false) {
    if (boost) {
      this.jump.boost.vel = v;
    } else {
      this.jump.vel = v;
    }
  }
  getGravity(boost = false) {
    if (boost) {
      return -this.jump.boost.gravity;
    } else {
      return -this.jump.gravity;
    }
  }
  setGravity(g = 37, boost = false) {
    if (boost) {
      this.jump.boost.gravity = -g;
    } else {
      this.jump.gravity = -g;
    }
  }
  setPlayerDeathFrames(frames) {
    this.frames_death = frames;
  }
  setPlayerFrames(frames, band_down = false) {
    if (!band_down) {
      this.frames = frames;
      this.frame = this.frames[this.currentFrame];
      this.frame.init_y = this.frame.position.y;
      scene.add(this.frame);
      let geometry = new THREE.BoxGeometry(0.5, 1.7, 0.7);
      let material = new THREE.MeshBasicMaterial({ color: 65280 });
      this.collisionBox = new THREE.Mesh(geometry, material);
      this.collisionBox.position.x = this.frame.position.x;
      this.collisionBox.position.y = this.frame.position.y + 1.4;
      this.collisionBox.position.z = this.frame.position.z;
      scene.add(this.collisionBox);
      this.collisionBox.visible = false;
    } else {
      this.frames_band = frames;
    }
  }
  nextFrame(ignore_jump = false) {
    if (!ignore_jump && this.jump.is_active)
      return;
    this.currentFrame++;
    if (this.currentFrame > this.frames.length - 1)
      this.currentFrame = 0;
    if (!input.keys.down.down) {
      this.frame.geometry = this.frames[this.currentFrame].geometry;
      this.collisionBox.scale.y = 1;
      this.collisionBox.scale.z = 1;
      this.collisionBox.position.z = this.frame.position.z;
      this.collisionBox.position.y = this.frame.position.y + 1.4;
    } else {
      this.frame.geometry = this.frames_band[this.currentFrame].geometry;
      this.collisionBox.scale.y = 0.5;
      this.collisionBox.scale.z = 2.5;
      this.collisionBox.position.z = this.frame.position.z - 0.5;
      this.collisionBox.position.y = this.frame.position.y + 0.7;
    }
  }
  deathFrame() {
    if (!input.keys.down.down) {
      this.frame.geometry = this.frames_death["wow"].geometry;
    } else {
      this.frame.geometry = this.frames_death["wow-down"].geometry;
    }
  }
  getY() {
    return this.frame.position.y;
  }
  setY(y) {
    this.frame.position.y = y;
  }
  initJump(timeDelta) {
    this.jump.is_active = true;
    this.jump.falling = false;
    this.frame.vel = this.jump.vel;
    this.frame.gravity = this.jump.gravity;
    this.frame.boost = false;
    this.nextFrame(true);
    audio.play("jump");
    if (!dynoDustEmitter.dead) {
      dynoDustEmitter.stopEmit();
    }
    if (input.keys.down.down) {
      this.block_fall_fast = true;
    }
  }
  doJump(timeDelta) {
    if (input.keys.space.justPressed && !this.jump.is_active && !input.keys.down.down) {
      this.initJump(timeDelta);
    }
    if (this.jump.is_active) {
      input.keys.space.clock.getElapsedTime();
      if (!this.frame.boost && input.keys.space.down && input.keys.space.clock.getElapsedTime() > 0.2) {
        this.frame.vel = this.frame.vel * this.jump.boost.vel;
        this.frame.gravity = this.jump.boost.gravity;
        this.frame.boost = true;
      }
      if (input.keys.down.justReleased) {
        this.block_fall_fast = false;
      }
      if (input.keys.down.down && !this.block_fall_fast) {
        this.frame.gravity = this.frame.gravity * 1.1;
        this.frame.geometry = this.frames_band[this.currentFrame].geometry;
        this.collisionBox.scale.y = 0.5;
        this.collisionBox.scale.z = 2.5;
        this.collisionBox.position.z = this.frame.position.z - 0.5;
        this.collisionBox.position.y = this.frame.position.y - 2;
      }
      this.frame.position.y = this.frame.position.y + this.frame.vel * timeDelta;
      if (input.keys.down.down && !this.block_fall_fast) {
        this.collisionBox.position.y = this.frame.position.y + 0.8;
      } else {
        this.collisionBox.position.y = this.frame.position.y + 1.4;
      }
      this.frame.vel = this.frame.vel + this.frame.gravity * timeDelta;
      if (this.frame.position.y <= this.frame.init_y) {
        if (!input.keys.space.down) {
          this.jump.is_active = false;
          if (!dynoDustEmitter.dead) {
            dynoDustEmitter.emit();
          }
        } else if (!input.keys.down.down) {
          this.initJump(timeDelta);
        } else {
          this.jump.is_active = false;
          if (!dynoDustEmitter.dead) {
            dynoDustEmitter.emit();
          }
        }
        this.frame.position.y = this.frame.init_y;
        this.collisionBox.position.y = this.frame.position.y + 1.4;
        input.keys.space.clock.elapsedTime = 0;
      }
    }
  }
  reset() {
    this.currentFrame = 0;
    this.nextFrame();
  }
  update(timeDelta) {
    if (this.frames) {
      this.anim_speed = 0.18 / (enemy.config.vel / 2);
      this.doJump(timeDelta);
      if (this.clock.getElapsedTime() > this.anim_speed) {
        this.clock.elapsedTime = 0;
        this.nextFrame();
      }
    }
  }
}
let player = new PlayerManager();
class NatureManager {
  constructor() {
    this.config = {
      "remove_z": {
        "ground": 50,
        "earth": 250
      },
      "levels": {
        "playground": {
          "max_amount": 20,
          "z_distance": 5,
          "z_distance_rand": [1, 3],
          "x_random_range": [-2.5, 2.5],
          "remove_z": 20,
          "spawn": null
        },
        "first": {
          "max_amount": 20,
          // 25 for z_distance = 4 is optimal
          "z_distance": 5,
          "z_distance_rand": [1, 4],
          "remove_z": 20,
          "spawn": null
        },
        "second": {
          "max_amount": 20,
          "z_distance": 10,
          "z_distance_rand": [1, 4],
          "remove_z": 20,
          "spawn": null
        },
        "third": {
          "max_amount": 10,
          "z_distance": 30,
          "z_distance_rand": [1, 7],
          "remove_z": 20,
          "spawn": null
        },
        "water": {
          "max_amount": 10,
          "z_distance": 20,
          "z_distance_rand": [1, 4],
          "remove_z": 20,
          "spawn": null
          // will be set at game start
        },
        "water2": {
          "max_amount": 20,
          "z_distance": 10,
          "z_distance_rand": [1, 2],
          "remove_z": 20,
          "spawn": null
          // will be set at game start
        },
        "empty": {
          "max_amount": 20,
          "z_distance": 10,
          "z_distance_rand": [1, 4],
          "remove_z": 20,
          "spawn": null
          // will be set at game start
        }
      },
      "misc_items": {
        "PalmTree": {
          "rescale_rand": [2, 3],
          "x_random_range": [-3, 3]
        },
        "tumbleweed": {
          "rescale_rand": [0.6, 0.8],
          "x_random_range": [-3, 3],
          "random_rotate_vel": [0.01, 0.1],
          "y_rotate": -(Math.PI / 2),
          "rotate_direction": "z",
          "behavior": "roll"
        },
        "cactus": {
          "rescale_rand": [0.6, 1.2],
          "x_random_range": [-3, 3],
          "y_random_rotate": [-80, 80]
        },
        "desert_skull": {
          "rescale_rand": [0.15, 0.3],
          "x_random_range": [-3, 3],
          "z_random_rotate": [-60, 60],
          "y_random_rotate": [-30, 30]
        },
        "scorpion": {
          "rescale_rand": [0.3, 0.7],
          // [.3, .7]
          "x_random_range": [-3, 3],
          "y_random_rotate": [-40, 40]
        },
        "rocks": {
          "rescale_rand": [0.5, 3],
          "x_random_range": [-3, 3]
        },
        "flowers": {
          "rescale_rand": [0.7, 1.3],
          "x_random_range": [-3, 3]
        },
        "trees": {
          "rescale_rand": [0.8, 3],
          "x_random_range": [-3, 3],
          "y_random_rotate": [-80, 80]
        },
        "fish": {
          "rescale_rand": [0.1, 0.4],
          "x_random_range": [-2.5, 2.5],
          "y_random_rotate": [-60, 60]
        },
        "seaweed": {
          "rescale_rand": [0.3, 1],
          "x_random_range": [-2.5, 2.5],
          "y_random_rotate": [-60, 60]
        }
      }
    };
    this.earth_chunks = [];
    this.ground_chunks = [];
    this.ground_chunks_decoration = [];
    this.ground_chunks_decoration_levels = [];
    this.water = null;
    this.rocks = [];
    this.flowers = [];
    this.misc = {};
    this.cache = {
      "earth": {
        "box": null,
        "geometry": null,
        "material": null,
        "texture": null
      },
      "ground": {
        "box": null,
        "geometry": null,
        "material": null
      },
      "ground_decoration": {
        "box": null,
        "geometry": null,
        "material": null
      },
      "water": {
        "geometry": null,
        "material": null
      },
      "rocks": {
        "geometry": null,
        "material": null
      },
      "flowers": {
        "geometry": null,
        "material": null
      },
      "misc": {
        "geometry": null,
        "material": null
      }
    };
  }
  initEarth(chunks = 3) {
    if (!this.cache.earth.geometry) {
      this.cache.earth.texture = load_manager.get_texture("t_ground").top;
      this.cache.earth.texture.wrapS = this.cache.earth.texture.wrapT = THREE.RepeatWrapping;
      this.cache.earth.texture.offset.set(0, 0);
      this.cache.earth.texture.repeat.set(100 / 8, 250 / 16);
      this.cache.earth.geometry = new THREE.BoxGeometry(100, 0, 250);
      this.cache.earth.material = new THREE.MeshLambertMaterial({ map: this.cache.earth.texture });
    }
    for (let i = 0; i < chunks; i++) {
      let chunk = new THREE.Mesh(this.cache.earth.geometry, this.cache.earth.material);
      chunk.receiveShadow = true;
      chunk.position.x = 0;
      chunk.position.y = nature.cache.ground.box.min.y - 0.5;
      if (i > 0) {
        let lChunk = this.earth_chunks[this.earth_chunks.length - 1];
        chunk.position.z = this.earth_chunks[this.earth_chunks.length - 1].position.z - 250 * lChunk.scale.z;
      } else {
        chunk.position.z = -20;
      }
      if (!this.cache.earth.box) {
        this.cache.earth.box = new THREE.Box3().setFromObject(chunk);
      }
      this.earth_chunks.push(chunk);
      scene.add(chunk);
    }
    this.earth_chunks.leader = this.earth_chunks.length - 1;
  }
  moveEarth(timeDelta) {
    for (let i = 0; i < this.earth_chunks.length; i++) {
      if (this.earth_chunks[i].position.z > this.config.remove_z.earth) {
        let lChunk = this.earth_chunks[this.earth_chunks.leader];
        this.earth_chunks[i].position.z = lChunk.position.z - 250 * lChunk.scale.z;
        this.earth_chunks.leader = i;
      }
      this.earth_chunks[i].position.z += enemy.config.vel * timeDelta;
    }
  }
  initWater() {
    if (this.cache.water.geometry === null) {
      this.cache.water.geometry = new THREE.BoxGeometry(8, 1, 250);
      this.cache.water.material = new THREE.MeshLambertMaterial({ color: 7266303, transparent: true, opacity: 0.85 });
    }
    this.water = new THREE.Mesh(this.cache.water.geometry, this.cache.water.material);
    scene.add(this.water);
    this.water.position.z = -75;
    this.water.position.x = -7;
    this.water.position.y = nature.cache.earth.box.max.y + 0.5;
  }
  initGround(chunks = 15) {
    let vox2 = load_manager.get_vox("ground");
    this.cache.ground = {
      "geometry": vox2.geometry,
      "material": vox2.material
    };
    for (let i = 0; i < chunks; i++) {
      let chunk = new THREE.Mesh(this.cache.ground.geometry, this.cache.ground.material);
      chunk.receiveShadow = true;
      chunk.position.y = -2.5;
      chunk.scale.set(1.5, 1.5, 1.5);
      if (i > 0) {
        let lChunk = this.ground_chunks[this.ground_chunks.length - 1];
        chunk.position.z = this.ground_chunks[this.ground_chunks.length - 1].position.z - 10 * lChunk.scale.z;
      } else {
        chunk.position.z = 15;
        if (!this.cache.ground.box) {
          this.cache.ground.box = new THREE.Box3().setFromObject(chunk);
        }
      }
      this.ground_chunks.push(chunk);
      scene.add(chunk);
    }
    this.ground_chunks.leader = this.ground_chunks.length - 1;
  }
  moveGround(timeDelta) {
    for (let i = 0; i < this.ground_chunks.length; i++) {
      if (this.ground_chunks[i].position.z > this.config.remove_z.ground) {
        let lChunk = this.ground_chunks[this.ground_chunks.leader];
        this.ground_chunks[i].position.z = lChunk.position.z - 10 * lChunk.scale.z;
        this.ground_chunks.leader = i;
      }
      this.ground_chunks[i].position.z += enemy.config.vel * timeDelta;
    }
  }
  initGroundDecoration(level_name, x, y, receiveShadow = true, spawn = "all", chunks = 11) {
    let vox2 = load_manager.get_vox("ground_bg");
    this.cache.ground_decoration = {
      "geometry": vox2.geometry,
      "material": vox2.material
    };
    let pool = [];
    for (let i = 0; i < chunks; i++) {
      let chunk = new THREE.Mesh(this.cache.ground_decoration.geometry, this.cache.ground_decoration.material);
      chunk.scale.set(3, 2, 3);
      chunk.position.x = x;
      chunk.position.y = y;
      chunk.receiveShadow = receiveShadow;
      if (i > 0) {
        let lChunk = pool[pool.length - 1];
        chunk.position.z = lChunk.position.z - 10 * lChunk.scale.z;
      } else {
        chunk.position.z = 15;
        this.cache.ground_decoration.box = new THREE.Box3().setFromObject(chunk);
      }
      this.ground_chunks_decoration_levels[level_name] = {
        "x": x,
        "y": y,
        "spawn": spawn,
        "box": new THREE.Box3().setFromObject(chunk)
      };
      pool.push(chunk);
      scene.add(chunk);
    }
    pool.leader = pool.length - 1;
    this.ground_chunks_decoration.push(pool);
  }
  moveGroundDecoration(timeDelta) {
    for (let i = 0; i < this.ground_chunks_decoration.length; i++) {
      for (let j = 0; j < this.ground_chunks_decoration[i].length; j++) {
        if (this.ground_chunks_decoration[i][j].position.z > this.config.remove_z.ground) {
          let lChunk = this.ground_chunks_decoration[i][this.ground_chunks_decoration[i].leader];
          this.ground_chunks_decoration[i][j].position.z = lChunk.position.z - 10 * lChunk.scale.z;
          this.ground_chunks_decoration[i].leader = j;
        }
        this.ground_chunks_decoration[i][j].position.z += enemy.config.vel * timeDelta;
      }
    }
  }
  async initMisc() {
    let vox2 = load_manager.get_vox("misc");
    this.cache.misc = {
      "geometry": await load_manager.get_mesh_geometry("misc"),
      "material": await load_manager.get_mesh_material("misc")
    };
    for (let l in this.config.levels) {
      let level = this.config.levels[l];
      let randLevel = this.ground_chunks_decoration_levels[l];
      if (!level.spawn) {
        delete this.config.levels[l];
        continue;
      }
      for (let i = 0; i < level.max_amount; i++) {
        let rand;
        let misc2 = null;
        if (level.spawn == "*") {
          rand = Math.floor(Math.random() * load_manager.assets["misc"].mesh.length);
          misc2 = new THREE.Mesh(
            this.cache.misc.geometry[rand],
            this.cache.misc.material[rand]
          );
        } else {
          rand = level.spawn[Math.floor(Math.random() * level.spawn.length)];
          misc2 = new THREE.Mesh(
            this.cache.misc.geometry[rand],
            this.cache.misc.material[rand]
          );
        }
        misc2.misc_type = vox2[rand].misc_type;
        let misc_type = misc2.misc_type.split("/")[0];
        misc2.castShadow = true;
        misc2.receiveShadow = true;
        misc2.randLevel = randLevel;
        if ("x_random_range" in level) {
          if (Array.isArray(level.x_random_range)) {
            misc2.position.x = this.random(
              randLevel.x + level.x_random_range[1],
              randLevel.x + level.x_random_range[0]
            );
          } else {
            misc2.position.x = this.random(
              randLevel.x + level.x_random_range[misc_type][1],
              randLevel.x + level.x_random_range[misc_type][0]
            );
          }
        } else {
          misc2.position.x = this.random(
            randLevel.x + this.config.misc_items[misc_type].x_random_range[1],
            randLevel.x + this.config.misc_items[misc_type].x_random_range[0]
          );
        }
        misc2.init_x = misc2.position.x;
        if ("behavior" in this.config.misc_items[misc_type]) {
          if (this.config.misc_items[misc_type].behavior == "roll") {
            misc2.geometry.center();
            misc2.position.y = randLevel.box.max.y + 0.6;
            misc2.position.z = randLevel.box.max.y;
            misc2.rotation.y = this.config.misc_items[misc_type].y_rotate;
            misc2.rotate_vel = this.random(this.config.misc_items[misc_type].random_rotate_vel[0], this.config.misc_items[misc_type].random_rotate_vel[1]);
          } else if (this.config.misc_items[misc_type].behavior == "move") {
            misc2.position.y = randLevel.box.max.y;
            if (typeof this.config.misc_items[misc_type].z_random_rotate !== "undefined") {
              let zRandomRotate = this.random(this.config.misc_items[misc_type].z_random_rotate[0], this.config.misc_items[misc_type].z_random_rotate[1]);
              misc2.rotateZ(THREE.Math.degToRad(zRandomRotate));
            }
            if (typeof this.config.misc_items[misc_type].y_random_rotate !== "undefined") {
              let yRandomRotate = this.random(this.config.misc_items[misc_type].y_random_rotate[0], this.config.misc_items[misc_type].y_random_rotate[1]);
              misc2.rotateY(THREE.Math.degToRad(yRandomRotate));
            }
          }
        } else {
          misc2.position.y = randLevel.box.max.y;
          if (typeof this.config.misc_items[misc_type].z_random_rotate !== "undefined") {
            let zRandomRotate = this.random(this.config.misc_items[misc_type].z_random_rotate[0], this.config.misc_items[misc_type].z_random_rotate[1]);
            misc2.rotateZ(THREE.Math.degToRad(zRandomRotate));
          }
          if (typeof this.config.misc_items[misc_type].y_random_rotate !== "undefined") {
            let yRandomRotate = this.random(this.config.misc_items[misc_type].y_random_rotate[0], this.config.misc_items[misc_type].y_random_rotate[1]);
            misc2.rotateY(THREE.Math.degToRad(yRandomRotate));
          }
          if (typeof this.config.misc_items[misc_type].y_add !== "undefined") {
            misc2.position.y += this.config.misc_items[misc_type].y_add;
          }
        }
        let rescaleRand = this.random(this.config.misc_items[misc_type].rescale_rand[0], this.config.misc_items[misc_type].rescale_rand[1]);
        misc2.scale.set(rescaleRand, rescaleRand, rescaleRand);
        let zRand = this.get_z("misc", l);
        if (l in this.misc && this.misc[l].length) {
          misc2.position.z = -(-this.misc[l][this.misc[l].length - 1].position.z + zRand);
        } else {
          misc2.position.z = zRand;
        }
        if (!(l in this.misc)) {
          this.misc[l] = [];
        }
        this.misc[l].push(misc2);
        scene.add(misc2);
      }
      this.misc[l].leader = level.max_amount - 1;
    }
  }
  moveMisc(timeDelta) {
    for (let l in this.config.levels) {
      let level = this.config.levels[l];
      this.ground_chunks_decoration_levels[l];
      if (!(l in this.misc)) {
        continue;
      }
      for (let i = 0; i < this.misc[l].length; i++) {
        let misc_type = this.misc[l][i].misc_type.split("/")[0];
        if (this.misc[l][i].position.z > level.remove_z) {
          let rescaleRand = this.random(
            this.config.misc_items[misc_type].rescale_rand[0],
            this.config.misc_items[misc_type].rescale_rand[1]
          );
          this.misc[l][i].scale.set(rescaleRand, rescaleRand, rescaleRand);
          let zRand = this.get_z("misc", l);
          this.misc[l][i].position.z = -(-this.misc[l][this.misc[l].leader].position.z + zRand);
          this.misc[l].leader = i;
          if ("behavior" in this.config.misc_items[misc_type]) {
            if (this.config.misc_items[misc_type].behavior == "roll") {
              this.misc[l][i].rotation.y = this.config.misc_items[misc_type].y_rotate;
            } else if (this.config.misc_items[misc_type].behavior == "move") {
              this.misc[l][i].position.x = misc.init_x;
            }
          } else {
            if (typeof this.config.misc_items[misc_type].z_random_rotate !== "undefined") {
              let zRandomRotate = this.random(this.config.misc_items[misc_type].z_random_rotate[0], this.config.misc_items[misc_type].z_random_rotate[1]);
              this.misc[l][i].rotateZ(THREE.Math.degToRad(zRandomRotate));
            }
            if (typeof this.config.misc_items[misc_type].y_random_rotate !== "undefined") {
              let yRandomRotate = this.random(this.config.misc_items[misc_type].y_random_rotate[0], this.config.misc_items[misc_type].y_random_rotate[1]);
              this.misc[l][i].rotateY(THREE.Math.degToRad(yRandomRotate));
            }
          }
          continue;
        }
        if ("behavior" in this.config.misc_items[misc_type]) {
          if (this.config.misc_items[misc_type].behavior == "roll") {
            this.misc[l][i].rotation[this.config.misc_items[misc_type].rotate_direction] -= this.misc[l][i].rotate_vel;
            this.misc[l][i].position.z += (enemy.config.vel * 1 + this.misc[l][i].rotate_vel * 20) * timeDelta;
          } else if (this.config.misc_items[misc_type].behavior == "move") {
            this.misc[l][i].position.x -= this.config.misc_items[misc_type].move_speed / 2 * -this.misc[l][i].rotation.y;
            this.misc[l][i].position.z += enemy.config.vel * timeDelta;
          }
        } else {
          this.misc[l][i].position.z += enemy.config.vel * timeDelta;
        }
      }
    }
  }
  random(from, to, float = true) {
    if (float) {
      return (Math.random() * (to - from) + from).toFixed(4);
    } else {
      return Math.floor(Math.random() * to) + from;
    }
  }
  get_z(type, level) {
    let zrr = this.random(
      this.config.levels[level].z_distance_rand[0],
      this.config.levels[level].z_distance_rand[1]
    );
    return this.config.levels[level].z_distance * zrr;
  }
  reset() {
    for (let l in this.config.levels) {
      for (let i = 0; i < this.misc[l].length; i++) {
        scene.remove(this.misc[l][i]);
      }
    }
    for (let i = 0; i < this.earth_chunks.length; i++) {
      scene.remove(this.earth_chunks[i]);
    }
    for (let i = 0; i < this.ground_chunks.length; i++) {
      scene.remove(this.ground_chunks[i]);
    }
    for (let i = 0; i < this.ground_chunks_decoration.length; i++) {
      for (let j = 0; j < this.ground_chunks_decoration[i].length; j++) {
        scene.remove(this.ground_chunks_decoration[i][j]);
      }
    }
    scene.remove(this.water);
    this.misc = [];
    this.earth_chunks = [];
    this.ground_chunks = [];
    this.ground_chunks_decoration = [];
    this.ground_chunks_decoration_levels = [];
    this.water = null;
  }
  update(timeDelta) {
    this.moveEarth(timeDelta);
    this.moveGround(timeDelta);
    this.moveGroundDecoration(timeDelta);
    this.moveMisc(timeDelta);
  }
}
let nature = new NatureManager();
class LoadManager {
  constructor() {
    this.assets = {};
    this.vox = {};
    this.onload = function () {
    };
    this.onassetload = function () {
    };
  }
  set_status(what, status = true) {
    this.assets[what].status = status;
    if (status) {
      logs.log("ASSET LOADED: " + what);
      if (this.onassetload) {
        this.onassetload();
      }
    }
    this.check();
    this.load_deps(what);
  }
  get_status(what) {
    return !!this.assets[what]["status"];
  }
  set_mesh(what, mesh) {
    this.assets[what].mesh = mesh;
  }
  get_mesh(what) {
    return this.assets[what].mesh;
  }
  set_vox(what, vox2) {
    this.assets[what].is_vox = true;
    this.assets[what].mesh = vox2;
  }
  get_vox(what) {
    return this.assets[what].mesh;
  }
  set_texture(what, texture) {
    this.assets[what].is_texture = true;
    this.assets[what].texture = texture;
  }
  get_texture(what) {
    return this.assets[what].texture;
  }
  get_random_mesh(what) {
    return this.assets[what].mesh[Math.floor(Math.random() * this.assets[what].mesh.length)];
  }
  async wait_for_mesh_material(what, i) {
    let ready = false;
    while (!ready) {
      try {
        this.assets[what].mesh[i].material;
        ready = true;
      } catch (e) {
        await new Promise((resolve, reject) => setTimeout(resolve, 10));
        ready = false;
      }
    }
    return this.assets[what].mesh[i].material;
  }
  async get_mesh_material(what) {
    if (Array.isArray(this.assets[what].mesh)) {
      let ms = [];
      for (let i = 0; i < this.assets[what].mesh.length; i++) {
        ms.push(await this.wait_for_mesh_material(what, i));
      }
      return ms;
    } else {
      return this.assets[what].mesh.material;
    }
  }
  async wait_for_mesh_geometry(what, i) {
    let ready = false;
    while (!ready) {
      try {
        this.assets[what].mesh[i].geometry;
        ready = true;
      } catch (e) {
        await new Promise((resolve, reject) => setTimeout(resolve, 10));
        ready = false;
      }
    }
    return new Promise((resolve, reject) => {
      resolve(this.assets[what].mesh[i].geometry);
    });
  }
  async get_mesh_geometry(what) {
    if (Array.isArray(this.assets[what].mesh)) {
      let gs = [];
      for (let i = 0; i < this.assets[what].mesh.length; i++) {
        gs.push(await this.wait_for_mesh_geometry(what, i));
      }
      return new Promise((resolve, reject) => {
        resolve(gs);
      });
    } else {
      return new Promise((resolve, reject) => {
        resolve(this.assets[what].mesh.geometry);
      });
    }
  }
  get_certain_mesh(what, type, type_field, return_index = false) {
    if (Array.isArray(type)) {
      let ms = [];
      for (let i = 0; i < this.assets[what].mesh.length; i++) {
        if (type.includes(this.assets[what].mesh[i][type_field]) || type.includes(this.assets[what].mesh[i][type_field].split("/")[0])) {
          if (return_index) {
            ms.push(i);
          } else {
            ms.push(this.assets[what].mesh[i]);
          }
        }
      }
      return ms;
    } else {
      for (let i = 0; i < this.assets[what].mesh.length; i++) {
        if (this.assets[what].mesh[i][type_field] == type) {
          if (return_index) {
            return i;
          } else {
            return this.assets[what].mesh[i];
          }
        }
      }
    }
  }
  get_mesh_box(what) {
    if (Array.isArray(this.assets[what].mesh)) {
      let gs = [];
      for (let i = 0; i < this.assets[what].mesh.length; i++) {
        if (this.assets[what].is_vox) {
          gs.push(new THREE.Box3().setFromObject(this.assets[what].mesh[i].createMesh()));
        } else {
          gs.push(new THREE.Box3().setFromObject(this.assets[what].mesh[i]));
        }
      }
      return gs;
    } else {
      if (this.assets[what].is_vox) {
        return new THREE.Box3().setFromObject(this.assets[what].mesh.createMesh());
      } else {
        return new THREE.Box3().setFromObject(this.assets[what].mesh);
      }
    }
  }
  set_loader(what, deps, callback) {
    this.assets[what] = {
      "status": false,
      "callback": callback,
      "mesh": null,
      "is_vox": false,
      "deps": deps
    };
  }
  load_all(callback, assetcallback) {
    logs.log("LOADING ALL ASSETS");
    this.onload = callback;
    this.onassetload = assetcallback;
    for (const asset in this.assets) {
      this.load_asset(asset);
    }
  }
  load_asset(asset) {
    if (this.get_status(asset)) {
      logs.log("ASSET ALREADY LOADED: " + asset, 1);
      return;
    }
    logs.log("LOADING ASSET: " + asset);
    if (this.assets[asset].deps) {
      for (let i in this.assets[asset].deps)
        if (!this.get_status(this.assets[asset].deps[i])) {
          logs.log("LOADING ASSET " + asset + " CANCELED, DEPS YET NOT LOADED: " + this.assets[asset].deps, 1);
          return false;
        }
    }
    this.assets[asset].callback();
  }
  load_deps(asset) {
    for (let i in this.assets) {
      if (this.assets[i].deps.includes(asset)) {
        this.load_asset(i);
      }
    }
  }
  check() {
    for (const asset in this.assets)
      if (!this.assets[asset].status)
        return false;
    logs.log("All assets loaded, starting the game.");
    this.onload();
    return true;
  }
  getLoadPercentage() {
    let total = Object.keys(this.assets).length;
    let loaded = 0;
    for (let k in this.assets) {
      if (this.assets[k].status) {
        loaded++;
      }
    }
    return Math.floor(100 * loaded / total);
  }
}
let load_manager = new LoadManager();
load_manager.set_loader("ground", [], function () {
  let parser = new vox.Parser();
  parser.parse(config.base_path + "objects/ground sand.vox").then(function (voxelData) {
    let builder = new vox.MeshBuilder(voxelData, { voxelSize: 0.1 });
    let material = new THREE.MeshLambertMaterial();
    material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);
    builder.material = material;
    load_manager.set_vox("ground", builder);
    load_manager.set_status("ground", true);
  });
});
load_manager.set_loader("ground_bg", [], function () {
  let parser = new vox.Parser();
  parser.parse(config.base_path + "objects/ground sand solid.vox").then(function (voxelData) {
    let builder = new vox.MeshBuilder(voxelData, { voxelSize: 0.1 });
    let material = new THREE.MeshLambertMaterial();
    material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);
    builder.material = material;
    load_manager.set_vox("ground_bg", builder);
    load_manager.set_status("ground_bg", true);
  });
});
load_manager.set_loader("dyno", ["ground"], function () {
  let parser = new vox.Parser();
  let frames = [];
  let framesCount = 7;
  for (let i = 0; i <= framesCount; i++) {
    parser.parse(config.base_path + "objects/t-rex/" + i + ".vox").then(function (voxelData) {
      let builder = new vox.MeshBuilder(voxelData, { voxelSize: 0.1 });
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);
      builder.material = material;
      let dyno = builder.createMesh();
      dyno.castShadow = true;
      frames[i] = dyno;
      if (frames.length - 1 == framesCount) {
        load_manager.set_mesh("dyno", frames);
        load_manager.set_status("dyno", true);
        player.setPlayerFrames(load_manager.get_vox("dyno"));
      }
    });
  }
});
load_manager.set_loader("dyno_band", ["dyno"], function () {
  let parser = new vox.Parser();
  let frames = [];
  let framesCount = 7;
  for (let i = 0; i <= framesCount; i++) {
    parser.parse(config.base_path + "objects/t-rex/band/" + i + ".vox").then(function (voxelData) {
      let builder = new vox.MeshBuilder(voxelData, { voxelSize: 0.1 });
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);
      builder.material = material;
      let dyno = builder.createMesh();
      dyno.castShadow = true;
      frames[i] = dyno;
      if (frames.length - 1 == framesCount) {
        load_manager.set_mesh("dyno_band", frames);
        load_manager.set_status("dyno_band", true);
        player.setPlayerFrames(frames, true);
      }
    });
  }
});
load_manager.set_loader("dyno_death", ["ground"], function () {
  let parser = new vox.Parser();
  let frames = {
    "wow": null,
    "wow-down": null
  };
  let framesItems = Object.keys(frames);
  let loaded = 0;
  for (let i = 0; i < framesItems.length; i++) {
    parser.parse(config.base_path + "objects/t-rex/other/" + framesItems[i] + ".vox").then(function (voxelData) {
      let builder = new vox.MeshBuilder(voxelData, { voxelSize: 0.1 });
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);
      builder.material = material;
      let mesh = builder.createMesh();
      mesh.castShadow = true;
      frames[framesItems[i]] = mesh;
      loaded++;
      if (loaded == framesItems.length) {
        load_manager.set_mesh("dyno_death", frames);
        load_manager.set_status("dyno_death", true);
        player.setPlayerDeathFrames(frames);
      }
    });
  }
});
load_manager.set_loader("cactus", ["ground"], function () {
  let parser = new vox.Parser();
  scene.getObjectByName("ground");
  let cactus = [];
  let cactusFiles = ["cactus", "cactus_tall", "cactus_thin", "fcactus", "fcactus_tall", "fcactus_thin"];
  for (let i = 0; i <= cactusFiles.length - 1; i++) {
    parser.parse(config.base_path + "objects/cactus/" + cactusFiles[i] + ".vox").then(function (voxelData) {
      let builder = new vox.MeshBuilder(voxelData, { voxelSize: 0.09 });
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);
      builder.material = material;
      cactus[i] = builder;
      if (cactus.length == cactusFiles.length) {
        load_manager.set_vox("cactus", cactus);
        load_manager.set_status("cactus", true);
      }
    });
  }
});
load_manager.set_loader("ptero", ["ground", "cactus"], function () {
  let parser = new vox.Parser();
  let frames = [];
  let framesCount = 5;
  for (let i = 0; i <= framesCount; i++) {
    parser.parse(config.base_path + "objects/ptero/" + i + ".vox").then(function (voxelData) {
      let builder = new vox.MeshBuilder(voxelData, { voxelSize: 0.1 });
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);
      builder.material = material;
      frames[i] = builder;
      if (frames.length - 1 == framesCount) {
        load_manager.set_vox("ptero", frames);
        load_manager.set_status("ptero", true);
      }
    });
  }
});
load_manager.set_loader("rocks", ["ground"], function () {
  let parser = new vox.Parser();
  let rocks = [];
  let rocksCount = 4;
  for (let i = 0; i <= rocksCount; i++) {
    parser.parse(config.base_path + "objects/rocks/" + i + ".vox").then(function (voxelData) {
      let builder = new vox.MeshBuilder(voxelData, { voxelSize: 0.1 });
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);
      builder.material = material;
      rocks[i] = builder;
      if (rocks.length - 1 == rocksCount) {
        load_manager.set_vox("rocks", rocks);
        load_manager.set_status("rocks", true);
      }
    });
  }
});
load_manager.set_loader("flowers", ["ground"], function () {
  let parser = new vox.Parser();
  let flowers = [];
  let flowersCount = 2;
  for (let i = 0; i <= flowersCount; i++) {
    parser.parse(config.base_path + "objects/flowers/" + i + ".vox").then(function (voxelData) {
      let builder = new vox.MeshBuilder(voxelData, { voxelSize: 0.1 });
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);
      builder.material = material;
      flowers[i] = builder;
      if (flowers.length - 1 == flowersCount) {
        load_manager.set_vox("flowers", flowers);
        load_manager.set_status("flowers", true);
      }
    });
  }
});
load_manager.set_loader("misc", ["ground"], function () {
  let parser = new vox.Parser();
  let misc2 = [];
  let miscItems = [
    "tumbleweed",
    "cactus/0",
    "cactus/1",
    "cactus/2",
    "cactus/3",
    "cactus/4",
    "cactus/5",
    "desert_skull",
    "scorpion",
    "rocks/0",
    "rocks/1",
    "rocks/2",
    "rocks/3",
    "rocks/4",
    "flowers/0",
    "flowers/1",
    "flowers/2",
    "trees/dead",
    "trees/green",
    "fish/0",
    "fish/1",
    "fish/2",
    "seaweed"
  ];
  for (let i = 0; i < miscItems.length; i++) {
    parser.parse(config.base_path + "objects/misc/" + miscItems[i] + ".vox").then(function (voxelData) {
      let builder = new vox.MeshBuilder(voxelData, { voxelSize: 0.1 });
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);
      builder.material = material;
      builder.misc_type = miscItems[i];
      misc2[i] = builder;
      if (misc2.length == miscItems.length) {
        load_manager.set_vox("misc", misc2);
        load_manager.set_status("misc", true);
      }
    });
  }
});
load_manager.set_loader("t_ground", [], function () {
  let loader = new THREE.TextureLoader();
  let textures = {
    "top": null
  };
  loader.load(config.base_path + "textures/ground_top.png", function (texture) {
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.offset.set(0, 0);
    texture.repeat.set(2, 1);
    textures.top = texture;
    load_manager.set_texture("t_ground", textures);
    load_manager.set_status("t_ground", true);
  });
});
class EffectsManager {
  constructor() {
    this.daytime = {
      "is_day": true,
      "duration": {
        "day": 60,
        // sec
        "night": 20
        // sec
      },
      "transition": {
        "active": false,
        "duration": 5,
        // sec
        "step": 1 / 30,
        // times/sec
        "clock": new THREE.Clock()
      },
      "intensity": {
        "day": {
          "ambient": ALight.intensity,
          "direct": DLight.intensity,
          "shadow_radius": 1
        },
        "night": {
          "ambient": 0,
          "direct": 0.1,
          "shadow_radius": 10
        }
      },
      "fog": {
        "day": {
          "color": [0.91, 0.7, 0.32]
        },
        "night": {
          "color": [0.24, 0.4, 0.55]
        },
        "diff_cache": null
      },
      "background": {
        "day": {
          "color": [0.91, 0.7, 0.32]
        },
        "night": {
          "color": [0.24, 0.4, 0.55]
        },
        "diff_cache": null
      },
      "clock": new THREE.Clock()
    };
    if (!config.renderer.effects) {
      this.update = function () {
      };
    }
  }
  changeDaytime(daytime = "day") {
    this.daytime.is_day = daytime == "day";
    this.daytime.clock.stop();
    this.daytime.clock.elapsedTime = 0;
    this.daytime.clock.start();
    this.stepTransition(!this.daytime.is_day, 1, 1);
  }
  stepTransition(darken = true, step, total) {
    let inc = step / total;
    if (darken) {
      if (inc === 1) {
        ALight.intensity = this.daytime.intensity.night.ambient;
        DLight.intensity = this.daytime.intensity.night.direct;
        scene.fog.color.setRGB(this.daytime.fog.night.color[0], this.daytime.fog.night.color[1], this.daytime.fog.night.color[2]);
        scene.background.setRGB(this.daytime.background.night.color[0], this.daytime.background.night.color[1], this.daytime.background.night.color[2]);
        DLight.shadow.radius = this.daytime.intensity.night.shadow_radius;
      } else {
        ALight.intensity = parseFloat((ALight.intensity - (this.daytime.intensity.day.ambient - this.daytime.intensity.night.ambient) * inc).toFixed(5));
        DLight.intensity = parseFloat((DLight.intensity - (this.daytime.intensity.day.direct - this.daytime.intensity.night.direct) * inc).toFixed(5));
        scene.fog.color.sub(this.daytime.fog.diff_cache);
        scene.background.sub(this.daytime.background.diff_cache);
        DLight.shadow.radius = parseFloat((DLight.shadow.radius - (this.daytime.intensity.night.shadow_radius - this.daytime.intensity.day.shadow_radius) * inc).toFixed(5));
      }
    } else {
      if (inc === 1) {
        ALight.intensity = this.daytime.intensity.day.ambient;
        DLight.intensity = this.daytime.intensity.day.direct;
        scene.fog.color.setRGB(this.daytime.fog.day.color[0], this.daytime.fog.day.color[1], this.daytime.fog.day.color[2]);
        scene.background.setRGB(this.daytime.background.day.color[0], this.daytime.background.day.color[1], this.daytime.background.day.color[2]);
        DLight.shadow.radius = this.daytime.intensity.day.shadow_radius;
      } else {
        ALight.intensity = parseFloat((ALight.intensity + (this.daytime.intensity.day.ambient - this.daytime.intensity.night.ambient) * inc).toFixed(5));
        DLight.intensity = parseFloat((DLight.intensity + (this.daytime.intensity.day.direct - this.daytime.intensity.night.direct) * inc).toFixed(5));
        scene.fog.color.add(this.daytime.fog.diff_cache);
        scene.background.add(this.daytime.background.diff_cache);
        DLight.shadow.radius = parseFloat((DLight.shadow.radius + (this.daytime.intensity.night.shadow_radius - this.daytime.intensity.day.shadow_radius) * inc).toFixed(5));
      }
    }
    this.daytime.transition.steps_done = parseFloat((this.daytime.transition.steps_done + step).toFixed(5));
  }
  startTransition(step, total) {
    let inc = step / total;
    this.daytime.transition.active = true;
    this.daytime.transition.clock.elapsedTime = 0;
    this.daytime.transition.clock.start();
    this.daytime.transition.steps_done = 0;
    this.daytime.fog.diff_cache = new THREE.Color();
    this.daytime.fog.diff_cache.setRGB(
      parseFloat((this.daytime.fog.day.color[0] - this.daytime.fog.night.color[0]) * inc),
      parseFloat((this.daytime.fog.day.color[1] - this.daytime.fog.night.color[1]) * inc),
      parseFloat((this.daytime.fog.day.color[2] - this.daytime.fog.night.color[2]) * inc)
    );
    this.daytime.background.diff_cache = new THREE.Color();
    this.daytime.background.diff_cache.setRGB(
      parseFloat((this.daytime.background.day.color[0] - this.daytime.background.night.color[0]) * inc),
      parseFloat((this.daytime.background.day.color[1] - this.daytime.background.night.color[1]) * inc),
      parseFloat((this.daytime.background.day.color[2] - this.daytime.background.night.color[2]) * inc)
    );
  }
  stopTransition() {
    this.daytime.transition.active = false;
    this.daytime.transition.clock.stop();
    this.daytime.transition.clock.elapsedTime = 0;
    this.daytime.transition.steps_done = 0;
  }
  reset() {
    this.stopTransition();
    this.changeDaytime("day");
  }
  pause() {
    this.pause_time = this.daytime.clock.getElapsedTime();
    this.daytime.clock.stop();
    if (this.daytime.transition.active) {
      this.pause_transition_time = this.daytime.transition.clock.getElapsedTime();
      this.daytime.transition.clock.stop();
    }
  }
  resume() {
    this.daytime.clock.start();
    this.daytime.clock.elapsedTime = this.pause_time;
    if (this.daytime.transition.active) {
      this.daytime.transition.clock.start();
      this.daytime.transition.clock.elapsedTime = this.pause_transition_time;
    }
  }
  update(timeDelta) {
    if (this.daytime.is_day) {
      if (!this.daytime.transition.active) {
        if (this.daytime.clock.getElapsedTime() > this.daytime.duration.day) {
          this.startTransition(this.daytime.transition.step, this.daytime.transition.duration);
        }
      } else {
        if (this.daytime.transition.steps_done < this.daytime.transition.duration) {
          if (this.daytime.transition.clock.getElapsedTime() > this.daytime.transition.step + this.daytime.transition.steps_done) {
            this.stepTransition(true, this.daytime.transition.step, this.daytime.transition.duration);
          }
        } else {
          this.stopTransition();
          this.changeDaytime("night");
        }
      }
    } else {
      if (!this.daytime.transition.active) {
        if (this.daytime.clock.getElapsedTime() > this.daytime.duration.night) {
          this.startTransition(this.daytime.transition.step, this.daytime.transition.duration);
        }
      } else {
        if (this.daytime.transition.steps_done < this.daytime.transition.duration) {
          if (this.daytime.transition.clock.getElapsedTime() > this.daytime.transition.step + this.daytime.transition.steps_done) {
            this.stepTransition(false, this.daytime.transition.step, this.daytime.transition.duration);
          }
        } else {
          this.stopTransition();
          this.changeDaytime("day");
        }
      }
    }
  }
}
let effects = new EffectsManager();

class TranslationManager {
  constructor() {
    this.currentLanguage = 'en';
    this.isSupported = 'Translator' in self;
    this.isInitialized = false;

    // Store original AI feedback text for translation
    this.originalAIFeedback = '';

    // Translatable text mapping
    this.translatableElements = {
      'ai-game-summary': 'AI Game Summary',
      'no-internet-title': 'No Internet Connection',
      'try-following': 'Try the following:',
      'check-network': 'Check your network cables, modem, and router.',
      'reconnect-wifi': 'Reconnect to your Wi-Fi network.',
      'start-game': 'Start Game',
      'game-over': 'GAME OVER',
      'analyzing-performance': 'Analyzing your performance...',
      'error-generating': 'Sorry, there was an error generating your summary. Please try again.',
      'language-label': 'Language:',
      'recent-game-text': 'Recent games',
    };
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Translator API not supported in this browser');
      return false;
    }

    try {
      this.isInitialized = true;
      console.log('Translation Manager initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize Translation Manager:', error);
      return false;
    }
  }

  setupLanguageSelector() {
    const languageSelect = document.getElementById('language-select');
    const languageSelector = document.getElementById('language-selector');
    const translationStatus = document.getElementById('translation-status');

    if (!languageSelect) return;

    // Hide the entire language selector if translation is not supported
    if (!this.isSupported) {
      if (languageSelector) {
        languageSelector.style.display = 'none';
      }
      return;
    }

    languageSelect.addEventListener('change', async (event) => {
      const newLanguage = event.target.value;
      await this.changeLanguage(newLanguage, translationStatus);
    });
  }

  async changeLanguage(targetLanguage, statusElement = null) {
    if (targetLanguage === this.currentLanguage) return;

    // Check if Translator API is available
    if (!this.isSupported) {
      console.warn('Translator API not supported in this browser');
      if (statusElement) {
        statusElement.textContent = 'Translation not supported in this browser';
        statusElement.style.display = 'block';
        setTimeout(() => {
          statusElement.style.display = 'none';
        }, 3000);
      }
      return;
    }

    if (statusElement) {
      statusElement.textContent = 'Loading translator...';
      statusElement.style.display = 'block';
    }

    try {
      // Check if this language pair is supported
      const availability = await Translator.availability({
        sourceLanguage: 'en',
        targetLanguage: targetLanguage
      });

      console.log(`Translator availability for en->${targetLanguage}: ${availability}`);

      if (availability === 'unavailable') {
        if (statusElement) {
          statusElement.textContent = `Translation to ${this.getLanguageName(targetLanguage)} is not supported`;
          setTimeout(() => {
            statusElement.style.display = 'none';
          }, 2000);
        }
        console.warn(`Translation to ${targetLanguage} is not supported`);
        // Reset to English
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
          languageSelect.value = 'en';
        }
        this.currentLanguage = 'en';
        this.resetUIToEnglish();
        return;
      }

      if (availability !== 'available') {
        if (statusElement) {
          statusElement.textContent = `Downloading language model (${targetLanguage})...`;
        }
      }


      this.currentLanguage = targetLanguage;

      // Translate all UI elements
      await this.translateUI();

      if (statusElement) {
        statusElement.textContent = '';
        statusElement.style.display = 'none';
      }

      console.log(`Language changed to: ${targetLanguage}`);

    } catch (error) {
      console.error('Error changing language:', error);
      if (statusElement) {
        statusElement.textContent = `Translation to ${targetLanguage} not available`;
        setTimeout(() => {
          statusElement.style.display = 'none';
        }, 2000);
      }
    }
  }

  async translateText(text, targetLanguage = null) {
    if (!this.isSupported || !text) return text;

    const language = targetLanguage || this.currentLanguage;
    if (language === 'en') return text;

    try {
      // Check if Translator API is actually available (not just 'Translator' in self)
      if (typeof Translator === 'undefined') {
        console.warn('Translator API not available');
        return text;
      }

      // Never create a translator where source equals target
      if (language === 'en') {
        return text;
      }

      const translator = await Translator.create({
        sourceLanguage: 'en',
        targetLanguage: language
      });

      return await translator.translate(text);
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }

  setOriginalAIFeedback(text) {
    this.originalAIFeedback = text;
  }

  async translateUI() {
    if (this.currentLanguage === 'en') {
      // Reset to original English text
      this.resetUIToEnglish();
      return;
    }

    // Translate all marked elements
    for (const [elementId, originalText] of Object.entries(this.translatableElements)) {
      const element = document.querySelector(`[data-translate="${elementId}"]`) ||
        document.getElementById(elementId);

      if (element) {
        try {
          const translatedText = await this.translateText(originalText);
          element.textContent = translatedText;
        } catch (error) {
          console.error(`Error translating ${elementId}:`, error);
        }
      }
    }
  }

  resetUIToEnglish() {
    // Reset all UI elements to original English text
    for (const [elementId, originalText] of Object.entries(this.translatableElements)) {
      const element = document.querySelector(`[data-translate="${elementId}"]`) ||
        document.getElementById(elementId);

      if (element) {
        element.textContent = originalText;
      }
    }
  }

  async translateGamePrompt(systemPrompt, userPrompt) {
    if (this.currentLanguage === 'en' || !this.isSupported) {
      return { systemPrompt, userPrompt };
    }

    try {
      const translatedSystemPrompt = await this.translateText(systemPrompt);
      const translatedUserPrompt = await this.translateText(userPrompt);

      return {
        systemPrompt: translatedSystemPrompt,
        userPrompt: translatedUserPrompt
      };
    } catch (error) {
      console.error('Error translating prompts:', error);
      return { systemPrompt, userPrompt }; // Return original if translation fails
    }
  }

  async translateResponse(responseText) {
    if (this.currentLanguage === 'en' || !responseText || !this.isSupported) {
      return responseText;
    }

    try {
      // For responses, we need to translate FROM English TO current language
      return await this.translateText(responseText);
    } catch (error) {
      console.error('Error translating response:', error);
      return responseText;
    }
  }

  getLanguageName(code) {
    const languages = {
      'en': 'English',
      'es': 'Español',
      'ru': 'Русский',
      'ja': '日本語',
      'zh': '中文',
      'hi': 'हिन्दी'
    };
    return languages[code] || code;
  }
}

class GameManager {
  constructor(interface_manager) {
    this.isPlaying = false;
    this.isPaused = false;
    this.isFirstStart = true;
    this.lastTimeDelta = false;
    this.interface = interface_manager;
    this.starter = null;
    this.stats = null;
    this.languageModel = null;
    this.worker = null;
    this.workerReady = false;
    // AI method tracking
    this.aiMethod = 'server';
    this.localModelReady = false;

    this.translator = new TranslationManager();
  }

  init() {
    // Initialize translation manager
    this.translator.init();

    // Start with server-side AI available immediately
    console.log('AI initialized with Gemini API');
    this.updateLLMTypeDisplay();

    // Initialize local models in the background
    this.initLocalModels();

    this.interface.init();
    visibly.visibilitychange(this.tabVisibilityChanged);
    window.onload = function () {
      // Setup language selector after DOM is loaded
      game.translator.setupLanguageSelector();

      load_manager.load_all(function () {
        game.interface.other.preloader.classList.add("hidden");
        if (config.debug) {
          game.interface.btnStartClick();
        } else {
          game.interface.buttons.start.classList.remove("hidden");
          game.setStarter();
        }
      }, function () {
        let p = load_manager.getLoadPercentage();
        game.interface.indicators.load.classList.add("bar-" + p);
      });
    };
    if (config.debug) {
      enemy.config.enable_collisions = false;
      input.addKeyCallback("debug_speedup", "justPressed", function () {
        enemy.increase_velocity(1);
      });
      enemy.increase_velocity(10);
    }
  }

  async initLocalModels() {
    // Try to initialize Chrome Prompt API first
    if ('LanguageModel' in self) {
      try {
        console.log('Attempting to initialize Chrome Prompt API...');
        const availability = await LanguageModel.availability();

        if (availability !== 'unavailable') {
          const params = await LanguageModel.params();
          this.languageModel = await LanguageModel.create({
            temperature: 0.2,
            topK: params?.defaultTopK,
          });

          console.log('Chrome Prompt API initialized successfully');
          this.switchToLocalModel('prompt-api');
          return;
        }
      } catch (err) {
        console.error('Chrome Prompt API initialization failed:', err);
      }
    }

    // If Prompt API fails, try Transformers.js
    console.log('Falling back to Transformers.js...');
    this.initTransformersWorker();
  }

  switchToLocalModel(modelType) {
    this.localModelReady = true;
    this.aiMethod = modelType;
    this.updateLLMTypeDisplay();
    console.log(`Switched to local AI model: ${modelType}`);
  }

  updateLLMTypeDisplay() {
    const llmTypeElement = document.getElementById('llm-type');
    if (!llmTypeElement) return;

    let displayText = '';
    switch (this.aiMethod) {
      case 'server':
        displayText = 'Using Gemini server model';
        break;
      case 'prompt-api':
        displayText = 'Using Built-in Gemini Nano model';
        break;
      case 'transformers':
        displayText = 'Using Transformers.js (SmolLM2-1.7B) model';
        break;
      default:
        displayText = 'Using Gemini server model';
    }

    llmTypeElement.textContent = displayText;
  }

  initTransformersWorker() {
    if (this.worker) {
      console.warn('Transformers.js worker already initialized.');
      return;
    }

    try {
      console.log('Initializing Transformers.js worker...');

      const workerPath = './js/worker.js';
      console.log('Using worker path:', workerPath);

      this.worker = new Worker(workerPath, {
        type: 'module'
      });

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.workerReady = false;

        // Stay with server-side if worker fails
        console.log('Staying with server-side AI due to worker error');
      };

      this.worker.onmessage = (e) => {
        const { status, output, data } = e.data;

        switch (status) {
          case 'loading':
            console.log('Transformers.js loading:', data);
            break;

          case 'ready':
            console.log('Transformers.js worker is ready');
            this.workerReady = true;
            this.switchToLocalModel('transformers');
            break;

          case 'start':
            // Only clear if we're actually using transformers for generation
            if (this.aiMethod === 'transformers') {
              const aiFeedbackText = document.getElementById('ai-feedback-text');
              aiFeedbackText.innerHTML = '';
              aiFeedbackText.dataset.rawText = '';
            }
            break;

          case 'update':
            // Only update if we're actually using transformers for generation
            if (this.aiMethod === 'transformers') {
              const aiFeedbackText = document.getElementById('ai-feedback-text');
              const currentText = aiFeedbackText.dataset.rawText || '';
              const newText = currentText + output;
              aiFeedbackText.dataset.rawText = newText;
              aiFeedbackText.innerHTML = renderMarkdown(newText);
            }
            break;

          case 'complete':
            // Only show result if we're actually using transformers for generation
            if (this.aiMethod === 'transformers') {
              const aiFeedbackText = document.getElementById('ai-feedback-text');
              const match = output[0].match(/<\|im_start\|>assistant\s*(.*?)<\|im_end\|>/s);
              const finalResult = match ? match[1].trim() : output[0];
              aiFeedbackText.innerHTML = renderMarkdown(finalResult);
            }
            break;

          case 'error':
            console.error('Worker error:', data);
            // Only show error if we're actually using transformers for generation
            if (this.aiMethod === 'transformers') {
              const aiFeedbackText = document.getElementById('ai-feedback-text');
              aiFeedbackText.innerHTML = 'Error generating summary. Please try again.';
            }
            break;
        }
      };

      console.log('Sending load message to worker...');
      this.worker.postMessage({ type: 'load' });
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      this.workerReady = false;
      console.log('Staying with server-side AI due to worker initialization failure');
    }
  }

  async generateGameSummaryGemini(gameData, systemPrompt, prompt) {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

      console.log('Generating summary via Vercel API for score:', gameData.score);

      const response = await fetch(`${apiBaseUrl}/api/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt,
          prompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server responded with status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let summary = '';

      const aiFeedbackText = document.getElementById('ai-feedback-text');
      aiFeedbackText.innerHTML = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        summary += chunk;

        // Update UI with each chunk for streaming effect - render markdown
        aiFeedbackText.innerHTML = renderMarkdown(summary);
      }

      console.log('Vercel API result:', summary);
      return summary;

    } catch (error) {
      console.error('Vercel API request failed:', error);
      throw error;
    }
  }

  async generateGameSummary() {
    const gameData = {
      score: Math.floor(score.score),
      highScore: Math.floor(score.highest_score),
      timePlayed: Math.floor(clock.getElapsedTime()),
    };

    const recentStats = score.getRecentScoresStats();

    const systemPrompt = 'You are DinoCoach, a concise feedback assistant for the Chrome Dino Runner game. A 2D game where the user plays as a Dino and has to jump or duck obstacles. There is no other functionality. The speed increases as the game goes on. The stats you receive are always from a SINGLE completed game run. "High Score" represents the player\'s best score across ALL previous games, NOT just the current run. Never make value judgments about whether the high score itself is good or bad - you have no benchmark for comparison. Focus on practical tips for jumping over cacti and ducking under pterodactyls based solely on score and survival time, but also be hopeful and fun in your answers.';

    let prompt = `Chrome Dino Game - Latest Run Results:
    Personal High Score: ${gameData.highScore}
    Current Run Score: ${gameData.score}
    Current Run Survival Time: ${gameData.timePlayed} seconds`;

    if (recentStats) {
      prompt += `
    Recent Scores: [${recentStats.scores.join(', ')}]`;
    }

    prompt += `

    Based ONLY on these metrics, provide:
    1. A brief assessment comparing current score to personal high score${recentStats ? ' and recent scores' : ''}.
    2. Two general tips to improve jumping/ducking timing for better survival.
    Keep your response under 150 words total.`;

    console.log('Generating game summary using:', this.aiMethod);

    const aiFeedbackText = document.getElementById('ai-feedback-text');
    this.updateLLMTypeDisplay();

    const analyzingMessage = await this.translator.translateText('Analyzing your performance...');

    // Only show "Analyzing..." for local models, not for Gemini API (since streaming clears it)
    if (this.aiMethod !== 'server') {
      aiFeedbackText.innerHTML = analyzingMessage;
    }

    try {
      // Translate prompts if needed (for non-English languages)
      const { systemPrompt: translatedSystemPrompt, userPrompt: translatedPrompt } =
        await this.translator.translateGamePrompt(systemPrompt, prompt);

      if (this.aiMethod === 'prompt-api' && this.languageModel) {
        // Use Chrome Prompt API - always create a fresh session to ensure correct language
        this.session = await LanguageModel.create({
          initialPrompts: [{
            role: 'system',
            content: translatedSystemPrompt
          }],
          temperature: 0.4,
          topK: (await LanguageModel.params()).defaultTopK
        });

        const stream = this.session.promptStreaming(translatedPrompt);
        let result = '';

        aiFeedbackText.innerHTML = '';

        for await (const chunk of stream) {
          result += chunk;
          const translatedChunk = await this.translator.translateResponse(chunk);
          // Accumulate and render markdown
          const currentText = aiFeedbackText.dataset.rawText || '';
          const newText = currentText + translatedChunk;
          aiFeedbackText.dataset.rawText = newText;
          aiFeedbackText.innerHTML = renderMarkdown(newText);
        }

        console.log('Chrome Prompt API result:', result);

      } else if (this.aiMethod === 'transformers' && this.worker && this.workerReady) {
        // Use Transformers.js
        const messages = [
          { role: 'system', content: translatedSystemPrompt },
          { role: 'user', content: translatedPrompt }
        ];

        this.worker.postMessage({
          type: 'generate',
          data: messages
        });

      } else {
        // Use Vercel API (streaming handled internally)
        const summary = await this.generateGameSummaryGemini(gameData, translatedSystemPrompt, translatedPrompt);
        console.log('Vercel API result:', summary);
      }

    } catch (error) {
      console.error('Error generating game summary:', error);

      // If local model fails, try server-side as fallback
      if (this.aiMethod !== 'server') {
        console.log('Local model failed, falling back to Vercel API...');
        try {
          const summary = await this.generateGameSummaryGemini(gameData, systemPrompt, prompt);
          aiFeedbackText.innerHTML = renderMarkdown(summary);
        } catch (serverError) {
          console.error('Vercel API fallback also failed:', serverError);
          const errorMessage = 'Sorry, there was an error generating your summary. Please try again.';
          aiFeedbackText.innerHTML = errorMessage;
        }
      } else {
        const errorMessage = 'Sorry, there was an error generating your summary. Please try again.';
        aiFeedbackText.innerHTML = errorMessage;
      }
    }
  }

  setStarter(timeout = 600) {
    if (!this.starter) {
      this.starter = input.addKeyCallback("space", "justPressed", function () {
        game.starter = null;
        audio.play("jump");
        if (timeout > 0) {
          game.interface.other.overlay.classList.add("before-start");
          setTimeout(function () {
            game.interface.btnStartClick();
          }, timeout);
        } else {
          game.interface.btnRestartClick();
        }
      }, 1);
    }
  }
  cancelStarter() {
    if (this.starter) {
      input.removeKeyCallback("space", this.starter);
      this.starter = null;
    }
  }
  async start() {
    if (this.isPlaying) {
      return false;
    }
    this.isPlaying = true;
    enemy.increase_velocity(15, true);
    score.set(0);
    clock.stop();
    clock.elapsedTime = 0;
    clock.start();
    nature.initGround();
    nature.initEarth();
    nature.initGroundDecoration("first", -17.3, nature.cache.earth.box.max.y);
    nature.initGroundDecoration("second", -29.5, nature.cache.earth.box.max.y + 1.6);
    nature.initGroundDecoration("third", -42, nature.cache.earth.box.max.y + 1.6 * 2, false);
    nature.ground_chunks_decoration_levels["playground"] = {
      "x": 0,
      "y": nature.cache.ground.box.max.y,
      "box": nature.cache.ground.box
    };
    nature.ground_chunks_decoration_levels["water"] = {
      "x": -9,
      "y": nature.cache.earth.box.max.y,
      "box": nature.cache.earth.box
    };
    nature.ground_chunks_decoration_levels["water2"] = {
      "x": -9,
      "y": nature.cache.earth.box.max.y,
      "box": nature.cache.earth.box
    };
    nature.ground_chunks_decoration_levels["empty"] = {
      "x": 7,
      "y": nature.cache.earth.box.max.y,
      "box": nature.cache.earth.box
    };
    nature.config.levels.first.spawn = load_manager.get_certain_mesh("misc", ["tumbleweed", "cactus", "desert_skull", "scorpion", "rocks", "flowers"], "misc_type", true);
    nature.config.levels.second.spawn = load_manager.get_certain_mesh("misc", ["tumbleweed", "desert_skull", "scorpion", "rocks", "flowers", "trees"], "misc_type", true);
    nature.config.levels.third.spawn = load_manager.get_certain_mesh("misc", ["tumbleweed", "trees"], "misc_type", true);
    nature.config.levels.playground.spawn = load_manager.get_certain_mesh("misc", ["desert_skull", "rocks", "flowers"], "misc_type", true);
    nature.config.levels.water.spawn = load_manager.get_certain_mesh("misc", ["fish"], "misc_type", true);
    nature.config.levels.water2.spawn = load_manager.get_certain_mesh("misc", ["seaweed", "rocks"], "misc_type", true);
    nature.config.levels.empty.spawn = load_manager.get_certain_mesh("misc", ["desert_skull", "flowers", "rocks", "tumbleweed"], "misc_type", true);
    nature.initWater();
    await nature.initMisc();
    player.init();
    enemy.init();
    audio.play("bg");
    this.cancelStarter();
    // Enable touch controls when game starts
    input.enableTouchControls();
    if (score.recent_scores.length > 0) {
      this.interface.other.recentScores.classList.remove("hidden");
    }
    clock.getDelta();
    this.render();
    this.loop();
    if (visibly.hidden()) {
      this.pause();
    }
  }
  stop() {
    if (!this.isPlaying) {
      return false;
    }
    this.isPlaying = false;
    // Disable touch controls when game stops
    input.disableTouchControls();
    dynoDustEmitter.removeAllParticles();
    dynoDustEmitter.stopEmit();
    dynoDustEmitter.dead = true;
    audio.stop("bg");
    this.interface.buttons.restart.classList.remove("hidden");
    this.interface.ai.aiFeedback.classList.remove("hidden");
    player.deathFrame();
    audio.play("killed");
    this.setStarter(0);

    // Record the final score
    score.addRecentScore(score.score, clock.getElapsedTime());

    this.generateGameSummary();
  }
  pause() {
    if (!this.isPlaying) {
      return false;
    }
    this.isPaused = true;
    this.isPlaying = false;
    // Disable touch controls when paused
    input.disableTouchControls();
    audio.pause("bg");
  }
  resume() {
    if (!this.isPaused) {
      return false;
    }
    this.isPlaying = true;
    this.isPaused = false;
    // Re-enable touch controls when resuming
    input.enableTouchControls();
    audio.resume("bg");
    clock.getDelta();
    this.render();
    this.loop();
  }
  reset() {
    enemy.increase_velocity(13, true);
    enemy.reset();
    nature.reset();
    score.reset();
    player.reset();
    effects.reset();
    clock.stop();
    clock.elapsedTime = 0;
    clock.start();
    this.render();
  }
  restart() {
    if (this.isPlaying) {
      this.stop();
    }
    this.interface.ai.aiFeedback.classList.add("hidden");

    const aiFeedbackText = document.getElementById('ai-feedback-text');
    if (aiFeedbackText) {
      aiFeedbackText.innerHTML = "";
    }

    this.reset();
    this.start();
  }
  render() {
    let timeDelta = clock.getDelta();
    if (timeDelta > 0.15) {
      timeDelta = 0.15;
    }
    if (config.camera.controls) {
      controls.update();
    }
    player.update(timeDelta);
    enemy.update(timeDelta);
    nature.update(timeDelta);
    input.update();
    effects.update(timeDelta);
    nebulaSystem.update();
    if (config.renderer.postprocessing.enable) {
      composer.render(timeDelta);
    } else {
      renderer.render(scene, camera);
    }
    score.update(timeDelta);
  }
  tabVisibilityChanged(state) {
    if (state == "visible") {
      logs.log("GAME RESUME");
      if (game.isPaused) {
        game.resume();
        effects.resume();
      }
    } else {
      logs.log("GAME PAUSE");
      if (game.isPlaying) {
        game.pause();
        effects.pause();
      }
    }
  }
  loop() {
    if (!this.isPlaying) {
      return false;
    }
    requestAnimationFrame(function () {
      game.loop();
    });
    this.render();
  }

  async checkWebGPUSupport() {
    try {
      if (!navigator.gpu) {
        return false;
      }
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch (e) {
      return false;
    }
  }
}
class InterfaceManager {
  constructor() {
    this.buttons = {
      "start": document.getElementById("game-start"),
      "restart": document.getElementById("game-restart")
    };
    this.indicators = {
      "load": document.getElementById("game-load-progress")
    };
    this.other = {
      "preloader": document.getElementById("preloader"),
      "overlay": document.getElementById("chrome-no-internet"),
      "recentScores": document.getElementById("recent-scores"),
    };
    this.ai = {
      "aiFeedback": document.getElementById("ai-feedback"),
      "aiFeedbackText": document.getElementById("ai-feedback-text")
    }
  }
  init() {
    this.buttons.start.addEventListener("click", this.btnStartClick);
    this.buttons.restart.addEventListener("click", this.btnRestartClick);
  }
  btnStartClick(e) {
    game.interface.buttons.start.display = "none";
    document.body.classList.add("game-started");

    // Hide language selector when game starts
    const languageSelector = document.getElementById("language-selector");
    if (languageSelector) {
      languageSelector.style.display = "none";
    }

    game.start();
  }
  btnRestartClick(e) {
    game.interface.buttons.restart.classList.add("hidden");
    game.restart();
  }
}
let game = new GameManager(new InterfaceManager());
game.init();