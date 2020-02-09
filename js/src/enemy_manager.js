/**
 * Enemy class v3.
 * This enemy spawner gererates N number of mesh groups(!) and renders them all to scene.
 * For optimization purposes, renderer.far or camera frustum must be limited.
 * Also, materials & geometry is cached.
 * @type {EnemyManager}
 */

class EnemyManager {
	constructor() {
		this.enemies = [];
		this.clock = new THREE.Clock();
		this.config = {
			"enable_collisions": true,
			"max_amount": {
				"cactus": 50,
				"ptero": 10
			}, // max ammount of enemy groups
			"vel": 0, // overall speed of all enemies and other moving elements in-game
			"score_z": 13, // z offset when score will be granted
			"remove_z": 25, // z offset when enemy will be removed
			"z_distance": {
				"cactus": 20,
				"ptero": 20
			}, // z distance between enemies
			"z_distance_rand": {
				"cactus": [.9, 2],
				"ptero": [.7, 3]
			}, // z distance random rescale range
			"rescale_rand": {
				"cactus": [.6, 1]
			}, // random rescale range
			"chance_to_spawn_tail": [100, 25], // tails spawn chances
			"tail_rescale_rand": [[.6, .9], [.4, .7]], // tails rescale rand

			"ptero_anim_speed": 0.10, // lower is faster
			"ptero_y_rand": [0, 1.3, 3.5] // random ptero y positions
		}

		this.cache = {
			"cactus": {
				"material": [],
				"geometry": []
			},
			"ptero": {
				"material": [],
				"geometry": []
			},
		}
	}

	init() {
		// set cache
		this.cache.cactus = {
			"geometry": load_manager.get_mesh_geometry('cactus'),
			"material": load_manager.get_mesh_material('cactus')
		};

		this.cache.ptero = {
			"geometry": load_manager.get_mesh_geometry('ptero'),
			"material": load_manager.get_mesh_material('ptero')
		};

		// spawn enemies
		for(let i = 0; i < this.config.max_amount.cactus; i++) {
			this.spawn('cactus');
		}
	}

	reset() {
		for(let i = 0; i < this.enemies.length; i++) {
			for(let j = 0; j < this.enemies[i].length; j++) {
				scene.remove(this.enemies[i][j]);
			}
		}

		this.enemies = [];
	}

	spawnPteros() {
		for(let i = 0; i < this.config.max_amount.ptero; i++) {
			this.spawn('ptero');
		}
	}

	findZForPtero(min_diff = 25, min_distance_btw = 50) {
		let last_z = 0;
		let ptero_last = this.eLast('ptero');
		if(ptero_last) {
			last_z = ptero_last[0].position.z;
		}

		for(let i = 1; i < this.enemies.length; i++) {
			let diff = (-this.enemies[i][0].position.z) - (-this.enemies[i-1][this.enemies[i-1].length-1].position.z);
			let z = -(-this.enemies[i][0].position.z - (diff / 2));
			if( diff > min_diff && (-last_z + diff + min_distance_btw) < -z ) {
				console.log("Z FOUND", z, "DIFF IS", diff);
				return z;
			}
		}

		// if not found
		console.log("Z FOR PTERO NOT FOUND, CHAINING TO THE END");
		let zRand = this.get_z('ptero');
		return -(-this.enemies[this.enemies.length-1][this.enemies[this.enemies.length-1].length-1].position.z + zRand);
	}

	spawn(type = 'cactus', tail = false, tail_number = 0) {
		let rand = Math.floor(Math.random() * load_manager.assets[type].mesh.length);
		let mesh = new THREE.Mesh(
			this.cache[type].geometry[rand],
			this.cache[type].material[rand]
		);

		mesh.enemy_type = type;
		mesh.castShadow = true;
		if(type == 'cactus') {
			mesh.rotation.y = -(Math.PI / 2);
		} else {
			// ptero
			mesh.current_frame = rand;
		}
		let enemiesGroup = [mesh];

		if(type == 'cactus')
		{
			// random rescale
			let rescaleRand = 1;
			if(tail) {
				// tail rescale
				rescaleRand = this.random(this.config.tail_rescale_rand[tail_number][0], this.config.tail_rescale_rand[tail_number][1]);
			} else {
				// head rescale
				rescaleRand = this.get_rr('cactus');
			}
			enemiesGroup[0].scale.set(rescaleRand, rescaleRand, rescaleRand);

			// reposition
			enemiesGroup[0].position.x = 0; // (nature.cache.ground.box.max.x / 2) - (enemy.userData['box3d'].max.x)
			enemiesGroup[0].position.y = nature.cache.ground.box.max.y + -nature.cache.ground.box.min.y - 2.5;

			let zRand = this.get_z('cactus');
			if(tail) {
				// tail z
				if(tail_number == 0) {
					enemiesGroup[0].position.z = -(-tail + (rescaleRand * 1.7));
				} else {
					enemiesGroup[0].position.z = -(-tail + (rescaleRand * 1.9));
				}
			} else {
				if(!this.enemies.length) {
					// first z
					enemiesGroup[0].position.z = -(zRand * 2);
				} else {
					// chain z
					// (-this.enemies[this.enemies.length-1].position.z + z_distance + (rr*1.8));
					enemiesGroup[0].position.z = -(-this.enemies[this.enemies.length-1][this.enemies[this.enemies.length-1].length-1].position.z + zRand);
				}
			}

			if(tail) {
				return enemiesGroup[0];
			} else if(type == 'cactus') {
				// only cactus type enemies can have tails
				if(Math.floor(Math.random() * 100) < this.config.chance_to_spawn_tail[0])
				{
					// spawn first tail
					enemiesGroup.push(this.spawn('cactus', enemiesGroup[0].position.z, 0));

					if(Math.floor(Math.random() * 100) < this.config.chance_to_spawn_tail[1])
					{
						// spawn second tail
						enemiesGroup.push(this.spawn('cactus', enemiesGroup[1].position.z, 1));
					}
				}
			}
		} else {
			// ptero

			// reposition
			enemiesGroup[0].position.x = 0; // (nature.cache.ground.box.max.x / 2) - (enemy.userData['box3d'].max.x)
			enemiesGroup[0].position.y =  this.get_ptero_y('ptero');

			enemiesGroup[0].position.z = this.findZForPtero();
		}

		// add to pool
		this.enemies.push(enemiesGroup);

		// add to scene
		for(let e = 0; e < enemiesGroup.length; e++) {
			scene.add(enemiesGroup[e]);

			// test
			// enemiesGroup[e].xbox = new THREE.BoxHelper( enemiesGroup[e], 0xffff00 );
			// scene.add(enemiesGroup[e].xbox);
		}
	}

	eFind(type) {
		let enemyGroups = [];
		for(let i = 0; i < this.enemies.length; i++) {
			if(this.enemies[i][0].enemy_type == type) {
				enemyGroups.push(this.enemies[i]);
			}
		}

		return enemyGroups;
	}

	eLast(type) {
		for(let j = this.enemies.length-1; j > 0; j--) {
			if(this.enemies[j][0].enemy_type == type) {
				return this.enemies[j];
			}
		}

		return false;
	}

	eCount(type) {
		let count = 0;
		for(let i = 0; i < this.enemies.length; i++) {
			if(this.enemies[i][0].enemy_type == type) {
				count++;
			}
		}

		return count;
	}

	random(from, to, float = true) {
		if(float) {
			return (Math.random() * (to - from) + from).toFixed(4)
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

	get_ptero_y(type) {
		return (nature.cache.ground.box.max.y + -nature.cache.ground.box.min.y - 2.5) + this.config.ptero_y_rand[this.random(0, this.config.ptero_y_rand.length, false)];
	}

	move(timeDelta) {
		for(let i = 0; i < this.enemies.length; i++) {
			if(this.enemies[i][0].position.z > this.config.remove_z) {
				// rechain
				let enemiesGroup = this.enemies.splice(i, 1)[0];

				if(enemiesGroup[0].enemy_type == 'cactus')
				{
					// cactus
					for(let x = 0; x < enemiesGroup.length; x++)
					{
						// rescale
						let rescaleRand = 1;
						if(x > 0) {
							// tail
							rescaleRand = this.random(this.config.tail_rescale_rand[x-1][0], this.config.tail_rescale_rand[x-1][1]);
						} else {
							// head
							rescaleRand = this.get_rr('cactus');
						}
						enemiesGroup[x].scale.set(rescaleRand, rescaleRand, rescaleRand);

						// reposition
						let zRand = this.get_z('cactus');
						if(x > 0) {
							// tail
							enemiesGroup[x].position.z = -(-enemiesGroup[x-1].position.z + (rescaleRand * 1.7));
						} else {
							// head
							// enemiesGroup[0].position.z = -(-this.enemies[this.enemies.length-1][this.enemies[this.enemies.length-1].length-1].position.z + zRand);
							let lEnemy = this.eLast('cactus');
							enemiesGroup[0].position.z = -(-lEnemy[0].position.z + zRand);
						}
					}
				} else
				{
					// ptero
					enemiesGroup[0].position.y = this.get_ptero_y('ptero');
					enemiesGroup[0].position.z = this.findZForPtero();
				}

				this.enemies.push(enemiesGroup);
			}

			for(let e = 0; e < this.enemies[i].length; e++) {
				// move
				if(this.enemies[i][e].enemy_type == 'cactus') {
					this.enemies[i][e].translateX(this.config.vel * timeDelta);
				} else {
					this.enemies[i][e].translateZ(this.config.vel * timeDelta);
				}
				// this.enemies[i][e].xbox.update();

				/**
				 * @TODO
				 * Optimization can be done.
				 */
				if(this.config.enable_collisions) {
					// check collision with player
					let eBox = this.box3 = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
					eBox.setFromObject(enemy.enemies[i][e]);

					let pBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
					pBox.setFromObject(player.collisionBox);

					if(eBox.intersectsBox(pBox)) {
						game.stop();
						return;
					}
				}
			}
		}
	}

    increase_velocity(add = 1, init = false) {
        if(this.config.vel >= 35 && !init)
            {return;}

        if(init) {
        	// set
        	this.config.vel = add;
        } else {
        	// add
        	this.config.vel += add;
        }

        if(this.config.vel < 10) {
            player.setVelocity(15);
                player.setVelocity(1.1, true);

            player.setGravity(37);
                player.setGravity(30, true);

            logs.log('Speed level 1');
        }
        else if(this.config.vel >= 10 && this.config.vel < 20 && (player.jump.vel == 15 || init)) {
            player.setVelocity(19);
                player.setVelocity(1.1, true);

            player.setGravity(60);
                player.setGravity(40, true);

            // speedup dust particles
            dynoDustEmitter.removeAllParticles();
            dynoDustEmitter.stopEmit();
            // nebulaSystem.removeEmitter(dynoDustEmitter);
            dynoDustEmitter = nebulaCreateDynoDustEmitter(7);
            nebulaSystem.addEmitter(dynoDustEmitter);

            logs.log('Speed level 2');
        }
        else if(this.config.vel >= 20 && this.config.vel < 30 && (player.jump.vel == 19 || init)) {
            player.setVelocity(25);
                player.setVelocity(1.3, true);

            player.setGravity(100);
                player.setGravity(70, true);

            // speedup dust particles
            dynoDustEmitter.removeAllParticles();
            dynoDustEmitter.stopEmit();
            // nebulaSystem.removeEmitter(dynoDustEmitter);
            dynoDustEmitter = nebulaCreateDynoDustEmitter(10);
            nebulaSystem.addEmitter(dynoDustEmitter);

            logs.log('Speed level 3');
        }
        else if(this.config.vel >= 30 && (player.jump.vel == 25 || init)) {
            player.setVelocity(30);
                player.setVelocity(1.5, true);

            player.setGravity(150);
                player.setGravity(70, true);

            // remove dust particles
            dynoDustEmitter.removeAllParticles();
            dynoDustEmitter.stopEmit();
            dynoDustEmitter.dead = true;

            logs.log('Speed level 4');
        }
    }

    normalizePteroPos(ptero, normalizer = 10) {
    	let ptero_pos = -ptero.position.z;

    	for(let i = 0; i < this.enemies.length; i++) {
    		let enemy = this.enemies[i][0];

    		if(enemy.enemy_type == 'cactus') {
    			let enemy_pos = -enemy.position.z;
    			let range = 4 * this.enemies[i].length; // z width of our check

    			if( (ptero_pos > enemy_pos-range) && (ptero_pos < enemy_pos+range) )
    			{
    				// in range, reposition ptero
    				// if( (ptero_pos > enemy_pos-range) ) {
    				// 	z = -(enemy_pos + range);
    				// } else {
    				// 	z = -(enemy_pos - range);
    				// }

    				let diff = (enemy_pos - (-this.enemies[i-1][0].position.z));
    				ptero.position.z = -(-this.enemies[i-1][0].position.z + diff / 2);

    				if(diff < 25) {
    					ptero.position.y = this.config.ptero_y_rand[this.config.ptero_y_rand.length - 1];
    				}
    			}
    		}
    	}
    }

    normalizePterozzzZ(z, normalizer_correction = 1, normalizer = 15) {

    	return z; // this function not works, pass for now

    	for(let i = 0; i < this.enemies.length; i++) {
    		let e = this.enemies[i][this.enemies[i].length-1];
    		if(e.enemy_type == 'cactus') {
    			if( (-z >= (-e.position.z - normalizer)) && (-z <= (-e.position.z + normalizer)) ) {
    				if( this.enemies[i].length > 1 ) {
    					normalizer_correction = this.enemies[i].length * 1.5;
    				}

    				if( (-z >= (-e.position.z - normalizer)) ) {
    					// too close
    					z = -(-z + (normalizer * normalizer_correction));
    				} else {
    					// too far
    					z = -(-z - (normalizer * normalizer_correction));
    				}

    				// recheck last 5
    				if(i > 0) {
    					i = i - 5;
    				}
    			}
    		}
    	}

    	return z;
    }

    pteroNextFrame() {
        for(let i = 0; i < this.enemies.length; i++) {
        	if(this.enemies[i][0].enemy_type == 'ptero') {
        		// animate
        		this.enemies[i][0].current_frame++;

        		if(this.enemies[i][0].current_frame > this.cache.ptero.geometry.length - 1) {
        			this.enemies[i][0].current_frame = 0;
        		}

        		this.enemies[i][0].geometry = this.cache.ptero.geometry[this.enemies[i][0].current_frame];
        	}
        }
    }

    update(timeDelta) {
    	this.move(timeDelta);

	    // draw ptero frames
	    if( this.clock.getElapsedTime() > this.config.ptero_anim_speed ) {
	        this.clock.elapsedTime = 0;
	        this.pteroNextFrame();
	    }
    }
}