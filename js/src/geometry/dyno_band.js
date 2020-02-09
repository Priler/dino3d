load_manager.set_loader('dyno_band', ['dyno'], function() {
  let parser = new vox.Parser();
  let frames = [];
  let framesCount = 7; // including 0

  for(let i = 0; i <= framesCount; i++) {
    // load all .vox frames
    parser.parse(config.base_path + 'objects/t-rex/band/' + i + '.vox').then(function(voxelData) {
      let builder = new vox.MeshBuilder(voxelData, {voxelSize: .1});
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);

      builder.material = material;
      let dyno = builder.createMesh();

      dyno.castShadow = true;

      dyno.position.y = nature.cache.ground.box.max.y + 0.001;
      dyno.position.z = 15;
      dyno.rotation.y = Math.PI / 2;

      frames[i] = dyno;
    });
  }

  var bTimeout = setInterval(function() {
    if(frames.length - 1 == framesCount) {
        clearInterval(bTimeout); 

        load_manager.set_vox('dyno_band', frames);
        load_manager.set_status('dyno_band', true);

        player.setPlayerFrames(frames, true);
    }
  }, 10);
});