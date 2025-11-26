// ==UserScript==
// @name         GeoFS Autoland
// @version      0.1
// @description  Makes autopilot landings actually smooth
// @author       GGamerGGuy and Ahmed
// @match        https://geo-fs.com/geofs.php*
// @match        https://*.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// @downloadURL  https://github.com/tylerbmusic/GeoFS-Autoland/raw/refs/heads/main/userscript.js
// @updateURL    https://github.com/tylerbmusic/GeoFS-Autoland/raw/refs/heads/main/userscript.js
// ==/UserScript==
//comment
function alWait() {
    if (window.geofs.cautiousWithTerrain == false) {
        setTimeout(() => {
            console.log("alInit");
            window.autolandInit();
        }, 1000);
    } else {
        setTimeout(() => {
            alWait();
        }, 1000);
    }
};
alWait();
window.autolandInit = function() {
    window.alOn = false;
    window.flaring = false;
    window.pitchInterval = null;
    window.autolandActivated = false;
    window.VLS = false;
    window.goingAround = false;
    window.RAD_TO_DEGREES = window.RAD_TO_DEGREES || 57.295779513082320876798154814105170332405472466564321549160243861202847148321552632440968995851110944186223381632864893281448264601248315036068267863411942122526388097467267926307988702893110767938261;
    setInterval(window.autolandInterval, 30);
};
window.activateAutoLand = function() {
    window.autolandActivated = true;
    if (window.geofs.autopilot.on) {
        window.geofs.autopilot.turnOff();
    }
    let navaid = window.geofs.nav.addGPSFIX([window.geofs.nav.units.NAV1.navaid.lat, window.geofs.nav.units.NAV1.navaid.lon]);
    window.geofs.nav.selectNavaid(navaid.id);
    window.geofs.autopilot.turnOn();
    window.geofs.autopilot.setMode("NAV");
    window.geofs.nav.units.GPS.OBS = window.geofs.nav.units.NAV1.course;
    window.geofs.autopilot.setAltitude(0);
    window.pitchInterval = setInterval(() => {
        window.gVS = (window.geofs.animation.values.groundSpeedKnt*101.27) * Math.tan(-3*(1/window.RAD_TO_DEGREES));
        let glideslope = (window.geofs.animation.getValue("NAV1Direction") === "to") ? (Math.atan(((window.geofs.animation.values.altitude/3.2808399+(window.geofs.aircraft.instance.collisionPoints[window.geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]+0.1))-window.geofs.nav.units.NAV1.navaid.elevation) / (window.geofs.animation.getValue("NAV1Distance")+window.geofs.runways.getNearestRunway([window.geofs.nav.units.NAV1.navaid.lat,window.geofs.nav.units.NAV1.navaid.lon,0]).lengthMeters*0.0185))*window.RAD_TO_DEGREES) : (Math.atan(((window.geofs.animation.values.altitude/3.2808399+(window.geofs.aircraft.instance.collisionPoints[window.geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]+0.1))-window.geofs.nav.units.NAV1.navaid.elevation) / Math.abs(window.geofs.animation.getValue("NAV1Distance")-window.geofs.runways.getNearestRunway([window.geofs.nav.units.NAV1.navaid.lat,window.geofs.nav.units.NAV1.navaid.lon,0]).lengthMeters*0.0185))*window.RAD_TO_DEGREES);
        window.requiredVS = window.gVS + ((-glideslope+3)*400);
        window.geofs.autopilot.setVerticalSpeed(window.requiredVS);
    }, 50);
}
window.alDeactivate = function() {
    window.controls.elevatorTrim = 0;
    window.alOn = false;
    window.flaring = false;
    window.autolandActivated = false;
    window.VLS = false;
    window.goingAround = false;
    if (window.pitchInterval) {
        clearInterval(window.pitchInterval);
    }
};
window.autolandInterval = function() {
    var agl = (window.geofs.animation.values.altitude !== undefined && window.geofs.animation.values.groundElevationFeet !== undefined) ? ((window.geofs.animation.values.altitude - window.geofs.animation.values.groundElevationFeet) + (window.geofs.aircraft.instance.collisionPoints[window.geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]*3.2808399)) : 'N/A';

    //Autoland general stuff
    if (!window.alOn && window.geofs.autopilot && window.geofs.autopilot.on && (window.geofs.autopilot.mode == 'NAV') && window.geofs.autopilot.VNAV && (window.geofs.nav.currentNAVUnit.navaid.type == 'ILS')) { //If the built-in ILS follower was just turned on
        window.alOn = true;
        if (window.geofs.nav.units.NAV1.distance < 5000) {
            window.activateAutoLand();
        }
        //Todo: more code
    } else if (window.alOn && window.geofs.autopilot && !window.geofs.autopilot.on) {
        window.wasAlOn = false;
        window.alOn = false;
        window.alDeactivate();
    }
    if (window.geofs.nav.units.NAV1.distance < 200) {
        window.geofs.autopilot.setMode("HDG");
    }
    if (window.alOn && !window.autolandActivated && (window.geofs.nav.units.NAV1.distance < 5000)) {
        window.activateAutoLand();
    }

    //Flaring
    if (window.alOn && !window.flaring && agl < ((0.000118323*window.geofs.aircraft.instance.definition.mass)+24.50304)) { //Start the flare
        window.flaring = true;
        window.geofs.autopilot.setMode("HDG");
        window.geofs.autopilot.setCourse(window.geofs.nav.units.NAV1.navaid.heading-Math.asin((window.weather.currentWindSpeed*Math.sin((((window.weather.currentWindDirection+3600)%360)-window.geofs.animation.values.heading360)*(1/window.RAD_TO_DEGREES)))/window.geofs.animation.values.ktas)*window.RAD_TO_DEGREES); //Adjust for wind
        if (window.pitchInterval) {
            clearInterval(window.pitchInterval);
        }
        window.alLastPitch = window.geofs.animation.values.verticalSpeed;
        window.alTarget = -window.geofs.aircraft.instance.definition.minimumSpeed*0.8;
        window.geofs.autopilot.setVerticalSpeed(window.alTarget);
        window.pitchInterval = setInterval(() => {
            let pitch = window.geofs.animation.values.verticalSpeed;
            if (!window.geofs.paused) {
                var agl = (window.geofs.animation.values.altitude !== undefined && window.geofs.animation.values.groundElevationFeet !== undefined) ? ((window.geofs.animation.values.altitude - window.geofs.animation.values.groundElevationFeet) + (window.geofs.aircraft.instance.collisionPoints[window.geofs.aircraft.instance.collisionPoints.length - 2].worldPosition[2]*3.2808399)) : 'N/A';
                window.alTargetDel = Math.min(50,Math.abs(pitch-window.alTarget)/7);
                window.alDelta = pitch - window.alLastPitch;
                let sign = (pitch-window.alTarget >= 0) ? -1 : 1;
                if (window.alDelta > window.alTargetDel*sign && window.controls.elevatorTrim > window.controls.elevatorTrimMin*0.7) {
                    window.controls.elevatorTrim -= window.controls.elevatorTrimStep*(0.0123077*window.geofs.aircraft.instance.definition.dragFactor+(0.00384615));
                } else if (window.alDelta < window.alTargetDel*sign && window.controls.elevatorTrim < window.controls.elevatorTrimMax*0.7) {
                    window.controls.elevatorTrim += window.controls.elevatorTrimStep*(0.0123077*window.geofs.aircraft.instance.definition.dragFactor+(0.00384615));
                }
            }
            window.alLastPitch = pitch;
        },50);
    }
    if (window.flaring && window.geofs.animation.values.groundContact) { //Stop when on ground contact
        window.alDeactivate();
        window.geofs.autopilot.toggle();
        window.controls.brakes = 1;
        window.controls.airbrakes.target = 1;
        window.controls.airbrakes.delta = 0.5;
        window.controls.throttle = -1;
    } else if (window.flaring && (agl > 300)) { //auto go-around
        clearInterval(window.pitchInterval);
        window.flaring = false;
        window.goingAround = true;
        window.geofs.autopilot.setVerticalSpeed(1000);
        window.geofs.autopilot.setAltitude(3000+Math.round(window.geofs.animation.values.altitude/1000)*1000);
        window.geofs.autopilot.setSpeed(window.geofs.aircraft.instance.definition.minimumSpeed*1.5);
    }
}
