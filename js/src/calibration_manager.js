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
        const keypointsToDraw = ['left_wrist', 'right_wrist', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_ankle', 'right_ankle'];
        webcam_input.calibrationUpdate(keypointsToDraw);
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

        if(leftWrist && rightWrist){
            this.leftArmX = leftWrist.position.x;
            this.rightArmX = rightWrist.position.x;
            webcam_input.setBounds(this.leftArmX, this.rightArmX);
        }

    }
  }