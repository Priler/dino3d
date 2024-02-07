const Pose = {
  NORMAL: 'NORMAL',
  JUMPING: 'JUMPING',
  CROUCHING: 'CROUCHING'
};

class BodyMovementsManager {
  constructor() {
    this.model = poseDetection.SupportedModels.MoveNet;
    this.detector = null;
    this.webcam = null;
    this.state = Pose.NORMAL;
    this.init();
  }

  init() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        this.webcam = document.getElementById('webcam');
        this.webcam.srcObject = stream;
        console.log('WEBCAM INITIALIZED')
      })
      .catch((err) => {
        console.log(err);
      });

    poseDetection.createDetector(this.model).then(detector => {
      this.detector = detector;
      console.log('DETECTOR INITIALIZED')
    }).catch(err => {
      console.log(err);
    });
  }

  pointsExist(pose, keypoints_names) {
    const poseKeypointNames = pose.keypoints.map(keypoint => keypoint.name);
    return keypoints_names.every(name => poseKeypointNames.includes(name));
  }

  getKeypoint(pose, keypointName) {
    if(pose.keypoints){
      return pose.keypoints.find(keypoint => keypoint.name === keypointName);
    }
  }

  isCrouching(pose){
    // Extract relevant joint positions
    const hipLeft = this.getKeypoint(pose, "left_hip");
    const hipRight = this.getKeypoint(pose, "right_hip");
    const kneeLeft = this.getKeypoint(pose, "left_knee");
    const kneeRight = this.getKeypoint(pose, "right_knee");
    const ankleLeft = this.getKeypoint(pose, "left_ankle");
    const ankleRight = this.getKeypoint(pose, "right_ankle");

    // Set thresholds
    const variation = 80;  // Example threshold
    const left = ((kneeLeft.y - hipLeft.y) < variation) || (kneeLeft.y <= hipLeft.y && hipLeft.y <= ankleLeft.y)
    const right = ((kneeRight.y - hipRight.y) < variation) || (kneeRight.y <= hipRight.y && hipRight.y <= ankleRight.y)

    // Check if angles indicate crouching
    return left && right;
  }

  isJumping(prevPose, currentPose) {
    if (!this.pointsExist(prevPose, ['left_ankle'])) return;
    if (!this.pointsExist(currentPose, ['left_ankle'])) return;
    const prevAnkleY = prevPose.keypoints.find(keypoint => keypoint.name === 'left_ankle').y;
    const currentAnkleY = currentPose.keypoints.find(keypoint => keypoint.name === 'left_ankle').y;
    const jumpThreshold = 10; // Adjust this threshold as needed
    return (currentAnkleY - prevAnkleY) > jumpThreshold;
  }

  update() {
    console.log("STATE:", this.state)
    if (this.detector) {
      this.detector.estimatePoses(this.webcam).then(poses => {
        const pose = poses[0];
        if (this.prevPose && pose.keypoints) {
          pose.keypoints = pose.keypoints.filter(keypoint => keypoint.score >= 0.30);

          //const jumpDetected = this.isJumping(this.prevPose, pose);
          //if (jumpDetected) {
          //  console.log('Jump detected!');
//
          //  input.setKey('space', true);
//
          //}
          if (this.isCrouching(pose) && this.state == Pose.NORMAL) {
            this.state = Pose.CROUCHING;
            input.setKey('down', true);
          }
          if(!this.isCrouching(pose) && this.state == Pose.CROUCHING){
            this.state = Pose.NORMAL;
            input.setKey('down', false);
          }
        }
        this.prevPose = pose;
        // Continue updating poses
        //requestAnimationFrame(() => this.update());
      });
    }
  }
}