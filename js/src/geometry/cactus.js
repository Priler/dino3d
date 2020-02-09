load_manager.set_loader('cactus', ['ground'], function() {
  let parser = new vox.Parser();
  let ground = scene.getObjectByName('ground');

  let cactus = [];
  let cactusFiles = ['cactus','cactus_tall','cactus_thin','fcactus','fcactus_tall','fcactus_thin'];

  for(let i = 0; i <= cactusFiles.length - 1; i++) {
    // load all cactuses
    parser.parse(config.base_path + 'objects/cactus/' + cactusFiles[i] + '.vox').then(function(voxelData) {
      let builder = new vox.MeshBuilder(voxelData, {voxelSize: .09});
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);

      builder.material = material;

      // mesh.castShadow = true;
      // mesh.userData['box3d'] = new THREE.Box3().setFromObject( mesh );

      // mesh.rotation.y = -(Math.PI / 2);

      cactus[i] = builder;
    });
  }

  var cTimeout = setInterval(function() {
    if(cactus.length == cactusFiles.length) {
        clearInterval(cTimeout); 

        load_manager.set_vox('cactus', cactus); // list
        load_manager.set_status('cactus', true);
    }
  }, 10);
});