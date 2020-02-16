/**
 * Effects class.
 * Rain, day/night, etc.
 * @type {EffectsManager}
 */

class EffectsManager {
    constructor() {

      // day/night circle
      this.daytime = {
        "is_day": true,
        "duration": {
          "day": 60, // seconds
          "night": 15 // night
        },
        "intensity": {
          "day": {
            "ambient": ALight.intensity,
            "direct": DLight.intensity
          },
          "night": {
            "ambient": 0,
            "direct": .2
          }
        },
        "fog": {
          "day": {
            "color": 0xE7B251
          },
          "night": {
            "color": 0x3E668D
          }
        },
        "background": {
          "day": {
            "color": 0xE7B251
          },
          "night": {
            "color": 0x3E668D
          }
        },
        "clock": new THREE.Clock()
      }

    }

    reset() {
      this.daytime.is_day = true;
      this.daytime.clock.elapsedTime = 0;
    }

    update(timeDelta) {
      if(this.daytime.is_day) {
        // day
        if(this.daytime.clock.getElapsedTime() > this.daytime.duration.day) {
          // turn to night
          ALight.intensity = this.daytime.intensity.night.ambient;
          DLight.intensity = this.daytime.intensity.night.direct;

          scene.background.setHex(this.daytime.background.night.color)
          scene.fog.color.setHex(this.daytime.fog.night.color);

          this.daytime.clock.elapsedTime = 0;
          this.daytime.is_day = false;
        }
      } else {
        // night
        if(this.daytime.clock.getElapsedTime() > this.daytime.duration.night) {
          // turn to day
          ALight.intensity = this.daytime.intensity.day.ambient;
          DLight.intensity = this.daytime.intensity.day.direct;

          scene.background.setHex(this.daytime.background.day.color)
          scene.fog.color.setHex(this.daytime.fog.day.color);

          this.daytime.clock.elapsedTime = 0;
          this.daytime.is_day = true;
        }
      }

      
    }
  }