"use strict";

//=include input_manager.js
//=include audio_manager.js
//=include enemy_manager.js
//=include score_manager.js
//=include init.js
//=include camera_controls.js
//=include camera.js
//=include light.js
//=include particles.js

//=include log_manager.js
let logs = new LogManager();
if(config.logs) {
	logs.enable();
}

//=include player_manager.js
let player = new PlayerManager();

//=include nature_manager.js
let nature = new NatureManager();

//=include load_manager.js
let load_manager = new LoadManager(); // start loading assets ASAP
//=include geometry.js

//=include game_manager.js
//=include interface_manager.js
let game = new GameManager(new InterfaceManager());
game.init(); // init game & interface ASAP