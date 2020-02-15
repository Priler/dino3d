load_manager.set_loader('t_ground', [], function() {
	let loader = new THREE.TextureLoader();
	let textures = {
		"top": null,
		"face": null
	};
	let loaded_textures = 0;

	loader.load(config.base_path + 'textures/ground_top.jpg', function ( texture ) {
		texture.magFilter = THREE.NearestFilter;

		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		texture.offset.set( 0, 0 );
		texture.repeat.set( 2, 1 );

		textures.top = texture;
		loaded_textures++;
	});

	loader.load(config.base_path + 'textures/ground_face.jpg', function ( texture ) {
		texture.magFilter = THREE.NearestFilter;

		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		texture.offset.set( 0, 0 );
		texture.repeat.set( 16, 1 ); // 8x8

		textures.face = texture;
		loaded_textures++;
	});


	let timeout = setInterval(function() {
	if(loaded_textures == 2) {
		clearInterval(timeout); 

		load_manager.set_texture('t_ground', textures);
	    load_manager.set_status('t_ground', true);
	}
	}, 10);
});