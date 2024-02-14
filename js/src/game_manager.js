/**
 * GameManager class.
 *
 * @type {EnemyManager}
 */

// States : BROWSER - CALIBRATION - PLAYING - PAUSED - GAMEOVER
const State = {
    BROWSER: 'BROWSER',
    CALIBRATION: 'CALIBRATION',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
}

class GameManager {
	constructor(interface_manager) {
        this.lastTimeDelta = false;
        this.state = State.BROWSER;

        this.interface = interface_manager;
        this.starter = null;
        this.stats = null;
	}

    init() {
        // init interface
        this.interface.init();

        // hook tab visibility
        visibly.visibilitychange(this.tabVisibilityChanged);

        window.onload = function() {
            // load all assets and start the game
            load_manager.load_all(function() {
                // all assets loaded
                game.interface.other.preloader.classList.add('hidden');

                if(config.debug) {
                    game.interface.btnStartClick();
                } else {
                    game.interface.buttons.start.classList.remove('hidden');
                    game.setStarter();
                }
            }, function() {
                // progress
                let p = load_manager.getLoadPercentage();
                game.interface.indicators.load.classList.add('bar-' + p);
            });
        }

        // debug
        if(config.debug) {
            enemy.config.enable_collisions = false;

            input.addKeyCallback('debug_speedup', 'justPressed', function() {
                enemy.increase_velocity(1);
            });

            enemy.increase_velocity(10);
        }
    }

    setStarter(timeout = 600) {
        if(!this.starter) {
            this.starter = input.addKeyCallback('space', 'justPressed', function() {
                game.starter = null;
                audio.play('jump');

                if(timeout > 0) {
                    game.interface.other.overlay.classList.add('before-start');
                    setTimeout(function() {
                        game.interface.btnStartClick();
                    }, timeout);
                } else {
                    game.interface.btnRestartClick();
                }
            }, 1);
        }
    }

    cancelStarter() {
        if(this.starter) {
            input.removeKeyCallback('space', this.starter);
            this.starter = null;
        }
    }

    async startCalibration(){
        this.state = State.CALIBRATION;

        this.loop();
    }

	async start() {
        if(this.state == State.PLAYING) {
            return false;
        }

		this.state = State.PLAYING;

		// set running speed (def 13)
		enemy.increase_velocity(15, true);

        // init score
        score.set(0);

        nature.initGround();
        nature.initEarth();

        // basic landscape
        nature.initGroundDecoration("first", -17.3, nature.cache.earth.box.max.y);
        nature.initGroundDecoration("second", -29.5, nature.cache.earth.box.max.y + 1.6);
        nature.initGroundDecoration("third", -42, nature.cache.earth.box.max.y + (1.6 * 2), false);

        // playground
        nature.ground_chunks_decoration_levels["playground"] = {
          "x": 0,
          "y": nature.cache.ground.box.max.y,
          "box": nature.cache.ground.box
        };

        // water level
        nature.ground_chunks_decoration_levels["water"] = {
          "x": -9,
          "y": nature.cache.earth.box.max.y,
          "box": nature.cache.earth.box
        };

        // water level additional
        nature.ground_chunks_decoration_levels["water2"] = {
          "x": -9,
          "y": nature.cache.earth.box.max.y,
          "box": nature.cache.earth.box
        };

        // water level additional
        nature.ground_chunks_decoration_levels["empty"] = {
          "x": 7,
          "y": nature.cache.earth.box.max.y,
          "box": nature.cache.earth.box
        };



        // var geometry = new THREE.BoxGeometry( .5, .5, .5 );
        // var material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
        // var cube = new THREE.Mesh( geometry, material );
        // scene.add( cube );
        // window.c = cube;

        // set spawns
        nature.config.levels.first.spawn = load_manager.get_certain_mesh('misc', ['tumbleweed', 'cactus', 'desert_skull', 'scorpion', 'rocks', 'flowers'], 'misc_type', true);
        nature.config.levels.second.spawn = load_manager.get_certain_mesh('misc', ['tumbleweed', 'desert_skull', 'scorpion', 'rocks', 'flowers', 'trees'], 'misc_type', true);
        nature.config.levels.third.spawn = load_manager.get_certain_mesh('misc', ['tumbleweed', 'trees'], 'misc_type', true);

        nature.config.levels.playground.spawn = load_manager.get_certain_mesh('misc', ['desert_skull', 'rocks', 'flowers'], 'misc_type', true);

        nature.config.levels.water.spawn = load_manager.get_certain_mesh('misc', ['fish'], 'misc_type', true);
        nature.config.levels.water2.spawn = load_manager.get_certain_mesh('misc', ['seaweed', 'rocks'], 'misc_type', true);

        nature.config.levels.empty.spawn = load_manager.get_certain_mesh('misc', ['desert_skull', 'flowers', 'rocks', 'tumbleweed'], 'misc_type', true);



        nature.initWater();
        // nature.initRocks();
        // nature.initFlowers(load_manager.get_vox('flowers'));
        await nature.initMisc();

        player.init();
        enemy.init();

        audio.play('bg');

        // cancel starters
        this.cancelStarter();

        // run the loop
        clock.getDelta(); // drop delta
        this.render(); // render first frame, then loop
        this.loop();

        // check if tab is hidden
        if(visibly.hidden()) {
            this.pause();
        }
	}

    stop() {
        if(this.state !== State.PLAYING) return false;
        this.state = State.GAMEOVER;

		// remove dust particles
		dynoDustEmitter.removeAllParticles();
		dynoDustEmitter.stopEmit();
		dynoDustEmitter.dead = true;

        // stop stuff
        audio.stop('bg');

        // show restart button
        this.interface.buttons.restart.classList.remove('hidden');

        // play kill sound & frame
        player.deathFrame();
        audio.play('killed');

        // set starters
        this.setStarter(0);
        calibration.reset();
    }

    pause() {

        if(this.state !== State.PLAYING) return false;
        
        this.state = State.PAUSED;
        audio.pause('bg');
    }

    resume() {
        if(this.state !== State.PAUSED) return false;
        this.state = State.PLAYING;
        
        audio.resume('bg');

        clock.getDelta(); // drop delta
        this.render();
        this.loop();
    }

    reset() {
        // reset running speed (def 13)
        enemy.increase_velocity(13, true);
        
        // reset stuff
        enemy.reset();
        nature.reset();
        score.reset();
        player.reset();
        effects.reset();

        // redraw to remove objects from scene
        //this.render();
    }

    restart() {
        console.log("Restart");
        if(this.state === State.PLAYING) {
            this.stop();
        }
        
        this.reset();
        this.start();
        game.interface.buttons.restart.classList.add('hidden');
        //this.state = State.PLAYING;
    }

    render() {
        let timeDelta = clock.getDelta();
        if(timeDelta > 0.15) {
            timeDelta = 0.15;
        }
        
        switch(this.state) {
            case State.PLAYING:
                this.playingUpdate(timeDelta);
                break;
            case State.GAMEOVER:
            case State.CALIBRATION:
                this.gameCalibrationUpdate(timeDelta);
                break;
            
        }
        

        
    }

    gameCalibrationUpdate(timeDelta){
        calibration.update(timeDelta);
        if(calibration.isCalibrated){
            calibration.isCalibrated = false;
            console.log("Calibrated");
            switch(this.state){
                case State.CALIBRATION:
                    this.start();
                    break;
                case State.GAMEOVER:
                    this.restart();
                    return;
            }
        }
        if(config.renderer.postprocessing.enable) {
            // postprocessing
            composer.render(timeDelta);
        } else {
            // standart
            renderer.render( scene, camera );
        }
    }
    playingUpdate(timeDelta){
        if(config.camera.controls) {
            controls.update();}

        player.update(timeDelta);
        enemy.update(timeDelta);
        nature.update(timeDelta);
        input.update();
        effects.update(timeDelta);
        updatePlayerDust();
        nebulaSystem.update();
        

        if(config.renderer.postprocessing.enable) {
            // postprocessing
            composer.render(timeDelta);
        } else {
            // standart
            renderer.render( scene, camera );
        }

        score.update(timeDelta);
    }

    tabVisibilityChanged(state) {
        if(state == 'visible') {
            // resume
            logs.log('GAME RESUME');
            if(this.state == State.PAUSED) {
                game.resume();
                effects.resume();
            }
        } else {
            // pause
            logs.log('GAME PAUSE');
            if(this.state == State.PLAYING) {
                game.pause();
                effects.pause();
            }
        }
    }

    loop() {
        if(!this.state == State.PLAYING && !this.state == State.CALIBRATION) {
            // stop the loop if necessary
            //return false;
        }

        requestAnimationFrame(function() {
            game.loop();
        });

        this.render();
    }
}