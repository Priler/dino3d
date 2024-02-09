/**
 * Player class.
 * @type {CalibrationManager}
 */

class CalibrationManager {
    
    constructor() {
        this.calibrationStage = 0;    
        this.timeLeft = 0;
    }

    canPlay(){
        return calibrationStage == 2;
    }
    
    update(timeDelta){
        const keypointsToDraw = ['left_wrist', 'right_wrist', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_ankle', 'right_ankle'];
        webcam_input.calibrationUpdate(this, keypointsToDraw);
        console.log("Calibration stage: " + this.calibrationStage);
        if (this.calibrationStage == 0){
            // Check if required number of samples have been collected
            
            /*const canStart = webcam_input.checkKeypoints();
            if (canStart){
                this.calibrationStage = 1;
            }
            */
            
            
            this.timeLeft = 2000; // 2 seconds
        } else {
            // Check if arms are in the right position
            const threshold = 50;
            const keypoints = webcam_input.keypointsToDraw;
            const sum = 0;
            // Calculate average of height
            keypoints.forEach(keypoint => {
                sum += keypoint.position.y;
            });

            const avg = sum / keypoints.length;

            // see if any keypoint is too far from the average
            const failed = false;
            keypoints.forEach(keypoint => {
                if (Math.abs(keypoint.position.y - avg) > threshold){
                    failed = true;
                }
            });

            if(failed){
                calibrationStage = 0;
                return;
            }

            this.timeLeft -= timeDelta;
            if (this.timeLeft <= 0){
                this.calibrationStage = 2;
            }        
        }
        

    }
  }