class BodyMovementsManager {
  constructor() {
    this.model = poseDetection.SupportedModels.MoveNet;
    this.detector = null;
    this.webcam = null;
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


  isJumping(prevPose, currentPose) {
    if (!this.pointsExist(prevPose, ['left_ankle'])) return;
    if (!this.pointsExist(currentPose, ['left_ankle'])) return;
    const prevAnkleY = prevPose.keypoints.find(keypoint => keypoint.name === 'left_ankle').y;
    const currentAnkleY = currentPose.keypoints.find(keypoint => keypoint.name === 'left_ankle').y;
    const jumpThreshold = 10; // Adjust this threshold as needed
    return (currentAnkleY - prevAnkleY) > jumpThreshold;
  }

  isSquatting(prevPose, currentPose) {
    if (!this.pointsExist(prevPose, ['left_knee'])) return;
    if (!this.pointsExist(currentPose, ['left_knee'])) return;
    const prevKneeY = prevPose.keypoints.find(keypoint => keypoint.name === 'left_knee').y;
    const currentKneeY = currentPose.keypoints.find(keypoint => keypoint.name === 'left_knee').y;
    const squatThreshold = -10; // Adjust this threshold as needed
    return (currentKneeY - prevKneeY) < squatThreshold;
  }

  update() {
    if (this.detector) {
      this.detector.estimatePoses(this.webcam).then(poses => {
        const pose = poses[0];
        if (this.prevPose && pose.keypoints) {
          pose.keypoints = pose.keypoints.filter(keypoint => keypoint.score >= 0.30);

          const jumpDetected = this.isJumping(this.prevPose, pose);
          const squatDetected = this.isSquatting(this.prevPose, pose);
          if (jumpDetected) {
            console.log('Jump detected!');

            input.setKey('space', true);

          }
          if (squatDetected) {
            console.log('Squat detected!');

            input.setKey('down', true);

          }
        }
        this.prevPose = pose;
        // Continue updating poses
        //requestAnimationFrame(() => this.update());
      });
    }
  }
}