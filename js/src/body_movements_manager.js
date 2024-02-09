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
    this.canvas = null;
    this.state = Pose.NORMAL;
    this.prevPose = null;
    this.requiredKeypoints = ["left_ankle", "right_ankle", "left_hip", "right_hip", "left_knee", "right_knee", "left_shoulder", "right_shoulder"];
    this.init();
  }

  init() {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        console.log("Stream", stream)
        this.webcam = document.getElementById('webcam');
        this.webcam.srcObject = stream;
        //check when its loaded
        this.webcam.onloadedmetadata = () => {
          this.canvas = document.getElementById('canvas');
          console.log(this.webcam.videoWidth)
          console.log(this.webcam.videoHeight)
          const ratio = this.webcam.videoWidth / this.webcam.videoHeight;
          this.canvas.width = this.canvas.height * ratio;
        };
        
        
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
    if(pose && pose.keypoints){
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

  isJumping(currentPose) {
    if(!this.prevPose) return false;
    const prevAnkleLeft = this.getKeypoint(this.prevPose, "left_ankle");
    const prevAnkleRight = this.getKeypoint(this.prevPose, "right_ankle");
    const currentAnkleLeft = this.getKeypoint(currentPose, "left_ankle");
    const currentAnkleRight = this.getKeypoint(currentPose, "right_ankle");
    const variation = 5; 
    //console.log("LEFT ANKLE", prevAnkleLeft.y, currentAnkleLeft.y);
    //console.log("RIGHT ANKLE", prevAnkleRight.y, currentAnkleRight.y);
    return (prevAnkleLeft.y - currentAnkleLeft.y) > variation && (prevAnkleRight.y - currentAnkleRight.y) > variation;
  }

  isCalibrated(keypointNames) {
    const pose = this.prevPose;
    if(!pose) return false;

    const threshold = 0.3;
    // Verify if all keypoints have better score than threshold
    const scoreCondition =  keypointNames.every(keypointName => {
      const keypoint = this.getKeypoint(pose, keypointName);
      return keypoint.score > threshold;
    });
    if(!scoreCondition){
      return false;
    }

    // Verifiy if arms are straight;
    // get min and max y of all keypoints~
    const armKeypoints = ["left_shoulder", "right_shoulder", "left_wrist", "right_wrist", "left_elbow", "right_elbow"];
    const keypoints = armKeypoints.map(keypointName => this.getKeypoint(pose, keypointName));
    const minY = Math.min(...keypoints.map(keypoint => keypoint.y));
    const maxY = Math.max(...keypoints.map(keypoint => keypoint.y));
    const variation = 30;

    const armsCondition = (maxY - minY) < variation;
    return scoreCondition && armsCondition;
  
  }

  clearCanvas() {
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawKeypoints(pose, keypointsToDraw = null) {
    
    this.clearCanvas();
    
    const heightProportion = this.canvas.height / this.webcam.videoHeight;
    const widthProportion = this.canvas.width / this.webcam.videoWidth;
    const ctx = this.canvas.getContext('2d');
    
    if(!keypointsToDraw){
      return;
    }

    keypointsToDraw.forEach(keypointName => {
      const kp = this.getKeypoint(pose, keypointName);
      if(!kp) return;
      ctx.beginPath();
      ctx.arc(kp.x * widthProportion, kp.y * heightProportion, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'green';
      ctx.fill();
    });

    
    
  }

  update() {
    if (this.detector) {
      this.detector.estimatePoses(this.webcam).then(poses => {
        const pose = poses[0];
        if(!pose.keypoints) return;
        
        //this.drawKeypoints(pose)
        //pose.keypoints = pose.keypoints.filter(keypoint => keypoint.score >= 0.30);

        // Check if jumping
        if (this.isJumping(pose) && this.state == Pose.NORMAL) {
          this.state = Pose.JUMPING;
          input.setKey('space', true);
        }
        if(!this.isJumping(pose) && this.state == Pose.JUMPING){
          this.state = Pose.NORMAL;
          input.setKey('space', false);
        }

        // Check if crouching
        if (this.isCrouching(pose) && this.state == Pose.NORMAL && !this.isJumping(pose)) {
          this.state = Pose.CROUCHING;
          input.setKey('down', true);
        }
        if(!this.isCrouching(pose) && this.state == Pose.CROUCHING){
          this.state = Pose.NORMAL;
          input.setKey('down', false);
        }

        this.strafe(pose);


        this.prevPose = pose;
      });
    }
  }

  calibrationUpdate(keypointsToRead) {
    if(this.detector){
      this.detector.estimatePoses(this.webcam).then(poses => {
        const pose = poses[0];
        if(!pose || !pose.keypoints) return;
        this.drawKeypoints(pose, keypointsToRead);
        this.prevPose = pose;
      });
    }
    
  }

  strafe(pose) {
    // get middle point between feet
    const leftAnkle = this.getKeypoint(pose, "left_ankle");
    const rightAnkle = this.getKeypoint(pose, "right_ankle");
    

    if(!leftAnkle || !rightAnkle) return;

    
    const leftBoundary = (this.webcam.videoWidth / 4);
    const rightBoundary = 3 * this.webcam.videoWidth / 4 ;

    const playableWidth = rightBoundary - leftBoundary;

    const middlePoint = (leftAnkle.x + rightAnkle.x) / 2;

    const position =  (middlePoint - leftBoundary) / (playableWidth);


    // left boundary = 250
    // 500
    // right boundary = 750
    // maxwidth 1000
    
    // if is left moveToPosition = 0
    // if middle  = 0.5
    // if is right moveToPosition = 1
    player.moveToPosition = position; // TODO:: improve
    

  }
}