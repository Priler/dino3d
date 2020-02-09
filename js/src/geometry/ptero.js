load_manager.set_loader('ptero', ['ground','cactus'], function() {
  let parser = new vox.Parser();
  let frames = [];
  let framesCount = 5; // including 0

  for(let i = 0; i <= framesCount; i++) {
    // load all .vox frames
    parser.parse(config.base_path + 'objects/ptero/' + i + '.vox').then(function(voxelData) {
      let builder = new vox.MeshBuilder(voxelData, {voxelSize: .1});
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);
      builder.material = material;

      // let ptero = builder.createMesh();

      // ptero.castShadow = true;

      // ptero.position.y = nature.cache.ground.box.max.y + 0.001;
      // ptero.position.z = 0;
      // ptero.rotation.y = Math.PI / 2;

      frames[i] = builder;
    });
  }

  var pTimeout = setInterval(function() {
    if(frames.length - 1 == framesCount) {
        clearInterval(pTimeout); 

        load_manager.set_vox('ptero', frames);
        load_manager.set_status('ptero', true);
    }
  }, 10);
});