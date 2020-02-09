load_manager.set_loader('misc', ['ground'], function() {
  let parser = new vox.Parser();

  let misc = [];
  let miscItems = ['PalmTree', 'Tumbleweed'];

  for(let i = 0; i < miscItems.length; i++) {
    // load all flowers
    parser.parse(config.base_path + 'objects/misc/' + miscItems[i] + '.vox').then(function(voxelData) {
      let builder = new vox.MeshBuilder(voxelData, {voxelSize: .1});
      let material = new THREE.MeshLambertMaterial();
      material.map = vox.MeshBuilder.textureFactory.getTexture(voxelData);
      builder.material = material;

      builder.misc_type = miscItems[i];

      misc[i] = builder;
    });
  }

  var miscTimeout = setInterval(function() {
    if(misc.length == miscItems.length) {
        clearInterval(miscTimeout); 

        load_manager.set_vox('misc', misc);
        load_manager.set_status('misc', true);
    }
  }, 10);
});