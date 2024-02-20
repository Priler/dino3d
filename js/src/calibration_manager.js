/**
 * Player class.
 * @type {CalibrationManager}
 */

class CalibrationManager {
    
    constructor() {
        this.isCalibrated = false;    
        this.timeLeft = 0.5;
    }

    canPlay(){
        return this.isCalibrated;
    }
    
    update(timeDelta){
        webcam_input.calibrationUpdate();
        if (!this.isCalibrated){
            // Check if required number of samples have been collected
            const isInCorrectPosition = webcam_input.isCalibrated(['left_wrist', 'right_wrist', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow']);
            if (isInCorrectPosition){
                this.timeLeft -= timeDelta;
                if (this.timeLeft <= 0){
                    this.finishCalibration();
                }
            } else {
                this.timeLeft = 0.5; // 2 seconds
            }
        }
    }

    finishCalibration(){
        this.isCalibrated = true;
        
        // Get left and right arm x positions
        const leftWrist = webcam_input.getKeypoint('left_wrist');
        const rightWrist = webcam_input.getKeypoint('right_wrist');

        const leftHip = webcam_input.getKeypoint('left_hip');
        const rightHip = webcam_input.getKeypoint('right_hip');
        const leftKnee = webcam_input.getKeypoint('left_knee');
        const rightKnee = webcam_input.getKeypoint('right_knee');
        const leftAnkle = webcam_input.getKeypoint('left_ankle');
        const rightAnkle = webcam_input.getKeypoint('right_ankle');

        const nose = webcam_input.getKeypoint('nose');
        const middleAnkle = (leftAnkle.y + rightAnkle.y) / 2;
        const personHeight = middleAnkle - nose.y;
        

        const avg = Math.abs((leftKnee.y - leftAnkle.y + rightKnee.y - rightAnkle.y) / 2)
        const femurLength = Math.abs((leftHip.y - leftKnee.y) + (rightHip.y - rightKnee.y) / 2)
        
        console.log("Calibration finished", leftWrist, rightWrist);

        if(leftWrist && rightWrist){
            webcam_input.setBounds(leftWrist.x, rightWrist.x);
            webcam_input.setJumpThreshold(avg / 15);
            const middle = webcam_input.averageYpoints(webcam_input.prevPose)
            webcam_input.setCrouchThreshold(middle * 1.15)
        }

    }

    reset(){
        this.isCalibrated = false;
        this.timeLeft = 0.5;
    }
  }