load_manager.set_loader('dyno', ['ground'], function() {
  let parser = new vox.Parser();
  let frames = [];
  let framesCount = 7; // including 0

  for(let i = 0; i <= framesCount; i++) {
    // load all .vox frames
    parser.parse(config.base_path + 'objects/t-rex/' + i + '.vox').then(function(voxelData) {
      let builder = new vox.MeshBuilder(voxelData, {voxelSize: .1});
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);

      builder.material = material;
      let dyno = builder.createMesh();

      dyno.castShadow = true;

      // let dynoBox = new THREE.Box3().setFromObject( dyno );
      // dyno.position.y = (floor.geometry.parameters.height / 2) + (dynoBox.max.y / 2) + 0.001;
      dyno.position.y = nature.cache.ground.box.max.y + 0.05;
      dyno.position.z = 15;
      dyno.rotation.y = Math.PI / 2;

      frames[i] = dyno;
    });
  }

  var dTimeout = setInterval(function() {
    if(frames.length - 1 == framesCount) {
        clearInterval(dTimeout); 
        
        // spawn dyno
        // scene.add(frames[0]);

        load_manager.set_vox('dyno', frames);
        load_manager.set_status('dyno', true);

        player.setPlayerFrames(load_manager.get_vox('dyno'));
    }
  }, 10);
});