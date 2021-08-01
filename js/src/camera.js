/**
 * Camera stuff.
 * @type {PerspectiveCamera}
 */

camera.position.x = 7.37041093612718;
camera.position.y = 3.428590611619372;
camera.position.z = 22.609984741761778;

camera.rotation.x = -0.2521795322818087;
camera.rotation.y = 0.5626175577081858;
camera.rotation.z = 0.1365832725087437;

if(config.camera.controls) {
	controls.target.set(-1.2946982583264495, -3.0793822864709634e-18, 9.30358864783445);
	controls.update();
}

window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize(){

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}
