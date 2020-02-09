/**
 * GameManager class.
 *
 * @type {EnemyManager}
 */

class GameManager {
	constructor(interface_manager) {
		this.isPlaying = false;
        this.isPaused = false;
        this.lastTimeDelta = false;

        this.interface = interface_manager;
        this.starter = null;
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
            }, function() {
                // progress
                let p = load_manager.getLoadPercentage();
                game.interface.indicators.load.innerHTML = p + '%';

                if(p >= 100) {
                    // game.interface.indicators.load.parentNode.style.display = 'none';
                    if(config.debug) {
                        game.interface.btnStartClick();
                        game.start();
                    } else {
                        game.interface.buttons.start.classList.remove('hidden');
                        game.setStarter();
                    }
                }
            });
        }

        // debug
        if(config.debug) {
            enemy.config.enable_collisions = false;
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

	start() {
        if(this.isPlaying) {
            return false;
        }

		this.isPlaying = true;

		// set running speed (def 13)
		enemy.increase_velocity(13, true);

        // init score
        score.set(0);

        // init stuff
        enemy.init();
        nature.initFlowers(load_manager.get_vox('flowers'));
        nature.initMisc(load_manager.get_vox('misc'));
        nature.initRocks();
        nature.initGround();
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
        if(!this.isPlaying) {return false;}

        // stop the loop
    	this.isPlaying = false;

		// remove dust particles
		dynoDustEmitter.removeAllParticles();
		dynoDustEmitter.stopEmit();
		dynoDustEmitter.dead = true;

        // stop stuff
        audio.stop('bg');

        // show restart button
        this.interface.buttons.restart.classList.remove('hidden');

        // play kill sound
        audio.play('killed');

        // set starters
        this.setStarter(0);
    }

    pause() {
        if(!this.isPlaying) {return false;}

        this.isPaused = true;
        this.isPlaying = false;
        audio.pause('bg');
    }

    resume() {
        if(!this.isPaused) {return false;}

        this.isPlaying = true;
        this.isPaused = false;
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

        // redraw to remove objects from scene
        this.render();
    }

    restart() {
        if(this.isPlaying) {
            this.stop();
        }

        this.reset();
        this.start();
    }

    render() {
        let timeDelta = clock.getDelta();

        if(timeDelta > 0.15) {
            timeDelta = 0.15;
        }

        if(config.camera.controls) {
            controls.update();}

        player.update(timeDelta);
        enemy.update(timeDelta);
        nature.update(timeDelta);
        input.update();
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
            if(game.isPaused) {
                game.resume();
            }
        } else {
            // pause
            if(game.isPlaying) {
                game.pause();
            }
        }
    }

    loop() {
        if(!this.isPlaying) {
            // stop the loop if necessary
            return false;
        }

        requestAnimationFrame(function() {
            game.loop();
        });

        this.render();
    }
}