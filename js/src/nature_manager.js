/**
 * Nature class v2.
 * 
 * @type {NatureManager}
 */

class NatureManager {

  constructor() {
    this.config = {
      "max_amount": {
        "rocks": 10,
        "flowers": 10,
        "misc": 10
      },
      "rescale_rand": {
        "rocks": [0.4, 1.8],
        "flowers": [0.5, 1.4]
      },
      "z_distance": {
        "rocks": 4,
        "flowers": 5,
        "misc": 10
      },
      "z_distance_rand": {
        "rocks": [.5, 4],
        "flowers": [2, 10],
        "misc": [1, 4]
      },
      "x_random_range": {
        "rocks": [-1.5, 1.5],
        "flowers": [-1.5, 1.5]
      },
      "remove_z": {
        "rocks": 25,
        "flowers": 20,
        "misc": 20,
        "ground": 40
      },
      "misc_items": {
        "PalmTree": {
          "rescale_rand": [2, 3],
          "x_random_range": [-25, -5]
        },
        "Tumbleweed": {
          "rescale_rand": [.6, .8],
          "x_random_range": [-25, -5],
          "random_rotate_vel": [0.01, 0.1]
        }
      }
    }

    this.ground_chunks = [];
    this.rocks = [];
    this.flowers = [];
    this.misc = [];

    this.cache = {
      "ground": {
        "box": null,
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

  initEarth() {
    // earth
    let cGeometry = new THREE.BoxGeometry( 120, .1, 200 );
    let cMaterial = new THREE.MeshLambertMaterial( {color: 0xDABF8C} );
    window.cube = new THREE.Mesh( cGeometry, cMaterial );

    window.cube.receiveShadow = true;

    cube.position.x = -15;
    cube.position.y = -.1;
    cube.position.z = -20;
    cube.rotation.z = -.15

    scene.add( cube );
  }

  initGround(chunks = 11) {
    // get vox
    let vox = load_manager.get_vox('ground');

    // set cache
    this.cache.ground = {
      "geometry": vox.geometry,
      "material": vox.material
    };

    // spawn ground chunks
    for(let i = 0; i < chunks; i++) {
      let chunk = new THREE.Mesh( this.cache.ground.geometry, this.cache.ground.material );
      chunk.position.y = -2.5;
      chunk.receiveShadow = true;
      // chunk.castShadow = true;

      if(i > 0) {
        // reposition
        chunk.position.z = this.ground_chunks[this.ground_chunks.length-1].position.z - 10;
      } else {
        // first
        chunk.position.z = 15;
        this.cache.ground.box = new THREE.Box3().setFromObject(chunk);
      }

      // push chunk to pool
      this.ground_chunks.push(chunk);

      // spawn chunk
      scene.add(chunk);
    }
  }

  moveGround(timeDelta) {
    for(let i = 0; i < this.ground_chunks.length; i++) {
      if(this.ground_chunks[i].position.z > this.config.remove_z.ground) {
        // re move
        let chunk = this.ground_chunks.splice(i, 1)[0];
        chunk.position.z = this.ground_chunks[this.ground_chunks.length-1].position.z - 10;
        this.ground_chunks.push(chunk);
      }

      // move
      this.ground_chunks[i].position.z += enemy.config.vel * timeDelta;
    }
  }

  initRocks() {
    // get vox
    let vox = load_manager.get_vox('rocks');

    // set cache
    this.cache.rocks = {
      "geometry": load_manager.get_mesh_geometry('rocks'),
      "material": load_manager.get_mesh_material('rocks')
    };

    // spawn some rocks
    for(let i = 0; i < this.config.max_amount.rocks; i++) {
      let rand = Math.floor(Math.random() * load_manager.assets['rocks'].mesh.length);
      let rock = new THREE.Mesh(
        this.cache.rocks.geometry[rand],
        this.cache.rocks.material[rand]
      );

      // rock.castShadow = true;
      rock.receiveShadow = true;
      rock.position.x = this.random(this.config.x_random_range['rocks'][0], this.config.x_random_range['rocks'][1]);
      rock.position.y = nature.cache.ground.box.max.y + 0.025;

      // rescale
      let rescaleRand = this.random(this.config.rescale_rand.rocks[0], this.config.rescale_rand.rocks[1]);
      rock.scale.set(rescaleRand, rescaleRand, rescaleRand);

      // reposition
      let zRand = this.get_z('rocks');
      if(this.rocks.length) {
        // tail z
        rock.position.z = -(-this.rocks[this.rocks.length-1].position.z + zRand);
      } else {
        // first z
        rock.position.z = zRand;
      }

      // add to pool
      this.rocks.push(rock);

      // add to scene
      scene.add(rock);
    }
  }

  moveRocks(timeDelta) {
    for(let i = 0; i < this.rocks.length; i++) {
      if(this.rocks[i].position.z > this.config.remove_z.rocks) {
        // re move
        let rock = this.rocks.splice(i, 1)[0];

        // rescale
        let rescaleRand = this.random(this.config.rescale_rand.rocks[0], this.config.rescale_rand.rocks[1]);
        rock.scale.set(rescaleRand, rescaleRand, rescaleRand);

        // reposition
        let zRand = this.get_z('rocks');
        rock.position.z = -(-this.rocks[this.rocks.length-1].position.z + zRand);
        rock.position.x = this.random(this.config.x_random_range['rocks'][0], this.config.x_random_range['rocks'][1]);

        this.rocks.push(rock);
      }

      // move
      this.rocks[i].translateZ(enemy.config.vel * timeDelta);
    }
  }

  initFlowers() {
    // get vox
    let vox = load_manager.get_vox('flowers');

    // set cache
    this.cache.flowers = {
      "geometry": load_manager.get_mesh_geometry('flowers'),
      "material": load_manager.get_mesh_material('flowers')
    };

    // spawn some flowers
    for(let i = 0; i < this.config.max_amount.flowers; i++) {
      let rand = Math.floor(Math.random() * load_manager.assets['flowers'].mesh.length);
      let flower = new THREE.Mesh(
        this.cache.flowers.geometry[rand],
        this.cache.flowers.material[rand]
      );

      flower.castShadow = true;
      flower.receiveShadow = true;
      flower.position.x = this.random(this.config.x_random_range['flowers'][0], this.config.x_random_range['flowers'][1]);
      flower.position.y = nature.cache.ground.box.max.y + 0.025;

      // rescale
      let rescaleRand = this.random(this.config.rescale_rand.flowers[0], this.config.rescale_rand.flowers[1]);
      flower.scale.set(rescaleRand, rescaleRand, rescaleRand);

      // reposition
      let zRand = this.get_z('flowers');
      if(this.flowers.length) {
        // tail z
        flower.position.z = -(-this.flowers[this.flowers.length-1].position.z + zRand);
      } else {
        // first z
        flower.position.z = zRand;
      }

      // add to pool
      this.flowers.push(flower);

      // add to scene
      scene.add(flower);
    }
  }

  moveFlowers(timeDelta) {
    for(let i = 0; i < this.flowers.length; i++) {
      if(this.flowers[i].position.z > this.config.remove_z.flowers) {
        // re move
        let flower = this.flowers.splice(i, 1)[0];

        // rescale
        let rescaleRand = this.random(this.config.rescale_rand.flowers[0], this.config.rescale_rand.flowers[1]);
        flower.scale.set(rescaleRand, rescaleRand, rescaleRand);

        // reposition
        let zRand = this.get_z('flowers');
        flower.position.z = -(-this.flowers[this.flowers.length-1].position.z + zRand);
        flower.position.x = this.random(this.config.x_random_range['flowers'][0], this.config.x_random_range['flowers'][1]);

        this.flowers.push(flower);
      }

      // move
      this.flowers[i].translateZ(enemy.config.vel * timeDelta);
    }
  }

  initMisc() {
    // get vox
    let vox = load_manager.get_vox('misc');

    // set cache
    this.cache.misc = {
      "geometry": load_manager.get_mesh_geometry('misc'),
      "material": load_manager.get_mesh_material('misc')
    };

    // spawn some misc
    for(let i = 0; i < this.config.max_amount.misc; i++) {
      let rand = Math.floor(Math.random() * load_manager.assets['misc'].mesh.length);
      let misc = new THREE.Mesh(
        this.cache.misc.geometry[rand],
        this.cache.misc.material[rand]
      );

      misc.misc_type = vox[rand].misc_type;
      misc.castShadow = true;
      misc.receiveShadow = true;
      misc.position.x = this.random(this.config.misc_items[misc.misc_type].x_random_range[0], this.config.misc_items[misc.misc_type].x_random_range[1]);
      // misc.position.y = nature.cache.ground.box.max.y + 0.025;

      if(misc.misc_type == 'Tumbleweed') {
        misc.position.y = (-misc.position.x * 0.15) + nature.cache.ground.box.max.y;
        misc.rotation.z = -(-misc.position.x * 0.02);
        misc.rotation.y = -(Math.PI / 2);
        misc.rotate_vel = this.random(this.config.misc_items[misc.misc_type].random_rotate_vel[0], this.config.misc_items[misc.misc_type].random_rotate_vel[1]);
      } else {
        misc.position.y = (-misc.position.x * 0.095) + nature.cache.ground.box.max.y;
        misc.rotation.z = -(-misc.position.x * 0.02);
      }

      // rescale
      let rescaleRand = this.random(this.config.misc_items[misc.misc_type].rescale_rand[0], this.config.misc_items[misc.misc_type].rescale_rand[1]);
      misc.scale.set(rescaleRand, rescaleRand, rescaleRand);

      // reposition
      let zRand = this.get_z('misc');
      if(this.misc.length) {
        // tail z
        misc.position.z = -(-this.misc[this.misc.length-1].position.z + zRand);
      } else {
        // first z
        misc.position.z = zRand;
      }

      // add to pool
      this.misc.push(misc);

      // add to scene
      scene.add(misc);
    }
  }

  moveMisc(timeDelta) {
    for(let i = 0; i < this.misc.length; i++) {
      if(this.misc[i].position.z > this.config.remove_z.misc) {
        // re move
        let misc = this.misc.splice(i, 1)[0];

        // rescale
        let rescaleRand = this.random(this.config.misc_items[misc.misc_type].rescale_rand[0], this.config.misc_items[misc.misc_type].rescale_rand[1]);
        misc.scale.set(rescaleRand, rescaleRand, rescaleRand);

        // reposition
        let zRand = this.get_z('misc');
        misc.position.z = -(-this.misc[this.misc.length-1].position.z + zRand);
        misc.position.x = this.random(this.config.misc_items[misc.misc_type].x_random_range[0], this.config.misc_items[misc.misc_type].x_random_range[1]);

        if(misc.misc_type == 'Tumbleweed') {
          misc.position.y = (-misc.position.x * 0.15) + nature.cache.ground.box.max.y;
          misc.rotation.z = -(-misc.position.x * 0.02);
          misc.rotation.y = -(Math.PI / 2);

          this.misc[i].rotate_vel = this.random(this.config.misc_items[misc.misc_type].random_rotate_vel[0], this.config.misc_items[misc.misc_type].random_rotate_vel[1]);
        } else {
          misc.position.y = (-misc.position.x * 0.095) + nature.cache.ground.box.max.y;
          misc.rotation.z = -(-misc.position.x * 0.02);
        }

        this.misc.push(misc);
      }

      // move
      if(this.misc[i].misc_type == 'Tumbleweed') {
        // rotate
        this.misc[i].geometry.center();
        this.misc[i].rotation.z -= this.misc[i].rotate_vel;
        this.misc[i].position.z += (enemy.config.vel * 1.3) * timeDelta;
      } else {
        this.misc[i].translateZ(enemy.config.vel * timeDelta);
      }
    }
  }

  random(from, to, float = true) {
    if(float) {
      return (Math.random() * (to - from) + from).toFixed(4)
    } else {
      return Math.floor(Math.random() * to) + from;
    }
  }

  get_z(type) {
    let zrr = this.random(this.config.z_distance_rand[type][0], this.config.z_distance_rand[type][1]);
    return this.config.z_distance[type] * zrr;
  }

  reset() {
    for(let i = 0; i < this.rocks.length; i++) {
      scene.remove(this.rocks[i]);
    }

    for(let i = 0; i < this.flowers.length; i++) {
      scene.remove(this.flowers[i]);
    }

    for(let i = 0; i < this.misc.length; i++) {
      scene.remove(this.misc[i]);
    }

    for(let i = 0; i < this.ground_chunks.length; i++) {
      scene.remove(this.ground_chunks[i]);
    }

    this.rocks = [];
    this.flowers = [];
    this.misc = [];
    this.ground_chunks = [];
  }

  update(timeDelta) {
    this.moveGround(timeDelta);
    this.moveRocks(timeDelta);
    this.moveFlowers(timeDelta);
    this.moveMisc(timeDelta);
  }

}