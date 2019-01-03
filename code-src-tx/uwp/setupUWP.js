import Gamepads from '../uwp-input/Gamepads.js';
import {heartBeatFrames} from './runMyScenes.js';
import GamepadInfo from '../uwp-input/GamepadInfo.js';
import VibrationPattern from '../uwp-input/VibrationPattern.js';
import {renderStore} from '../render/setupWebGL.js';

const GamepadButtons = Windows.Gaming.Input.GamepadButtons;

Windows.Gaming.Input.Gamepad.addEventListener('gamepadadded', event => {
    event.detail.forEach(gamepad => {
        console.log(`gamepad connected`);

        Gamepads.gamepads.add(gamepad);
        Gamepads.info.set(gamepad, new GamepadInfo(gamepad.getCurrentReading(), false, new VibrationPattern()));
    });
});

Windows.Gaming.Input.Gamepad.addEventListener('gamepadremoved', event => {
    event.detail.forEach(gamepad => {
        console.log(`gamepad disconnected`);

        Gamepads.gamepads.delete(gamepad);
        Gamepads.info.delete(gamepad);
    });
});


/*
 * UWP SYSTEM
 */

navigator.gamepadInputEmulation = 'gamepad';
{
    const result = Windows.UI.ViewManagement.ApplicationViewScaling.trySetDisableLayoutScaling(true);
    console.log('layout scaling disabled: ' + result);
}

const applicationView = Windows.UI.ViewManagement.ApplicationView.getForCurrentView();
{
    const result = applicationView.setDesiredBoundsMode(Windows.UI.ViewManagement.ApplicationViewBoundsMode.useCoreWindow);
    console.log('overscan turned off: ' + result);
}

Windows.UI.WebUI.WebUIApplication.addEventListener('activated', event => console.log(event));
Windows.UI.WebUI.WebUIApplication.addEventListener('suspending', event => console.log(event));
Windows.UI.WebUI.WebUIApplication.addEventListener('resuming', event => console.log(event));
Windows.UI.WebUI.WebUIApplication.addEventListener('navigated', event => console.log(event));
Windows.UI.WebUI.WebUIApplication.addEventListener('enteredbackground', event => console.log(event));
Windows.UI.WebUI.WebUIApplication.addEventListener('leavingbackground', event => console.log(event));

//const msg = new Windows.UI.Popups.MessageDialog('Quit Bang Bang Poker?');
//msg.commands.append(new Windows.UI.Popups.UICommand('Yes'));
//msg.commands.append(new Windows.UI.Popups.UICommand('Cancel'));
//msg.defaultCommandIndex = 0;
//msg.cancelCommandIndex = 1;
//msg.showAsync().then(cmd => {
//    console.log('popup user interaction: ' + cmd.label);
//});

const systemManager = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
systemManager.addEventListener('backrequested', backRequestedEventArgs => {
    console.log('back requested');
    backRequestedEventArgs.handled = true;
});

console.log('user picker supported: ' + Windows.System.UserPicker.isSupported());


//////////////////////
// handle UWP input //
//////////////////////

export function handleInput() {
    for (const gamepad of Gamepads.gamepads) {
        const info = Gamepads.info.get(gamepad);
        const newReading = gamepad.getCurrentReading();

        if (Gamepads.buttonPressed(newReading, info.oldReading, GamepadButtons.a)) {
            console.log(`a gamepad pressed A button`);
            Gamepads.vibrate(gamepad, info, heartBeatFrames);

        } else if (Gamepads.buttonReleased(newReading, info.oldReading, GamepadButtons.a)) {
            console.log(`a gamepad released A button`);
        }

        if (Gamepads.buttonPressed(newReading, info.oldReading, GamepadButtons.y)) {
            signIn(gamepad);
        }

        if (info.isVibrating) {
            const vibration = info.vibration;
            if (renderStore.frame == vibration.nextTimeFrame) {
                vibration.currentFrame++;

                if (vibration.currentFrame < vibration.frames.length) {
                    const keyframe = vibration.frames[vibration.currentFrame];
                    vibration.nextTimeFrame = renderStore.frame + keyframe.duration;
                    gamepad.vibration = keyframe.vibration;

                } else {
                    info.isVibrating = false;
                }
            }
        }

        info.oldReading = newReading;
    }

}

function signIn(gamepad) {
    const userPicker = new Windows.System.UserPicker();
    userPicker.suggestedSelectedUser = gamepad.user;
    userPicker.pickSingleUserAsync()
        .then(user => {
            const xblUser = new Microsoft.Xbox.Services.System.XboxLiveUser(user);

            try {
                xblUser.signInAsync(null)
                    .then(signInResult => {
                        if (signInResult.status == Microsoft.Xbox.Services.System.SignInStatus.success) {
                            console.log('user signed in successfully');
                            console.log('gamer tag: ' + xblUser.gamertag);

                            const xblCtx = new Microsoft.Xbox.Services.XboxLiveContext(xblUser);
                            xblCtx.profileService.getUserProfileAsync(xblUser.xboxUserId)
                                .then(profile => {
                                    console.log('got user profile');
                                    console.log('name: ' + profile.gameDisplayName);
                                    console.log('pic: ' + profile.gameDisplayPictureResizeUri);
                                    console.log('score: ' + profile.gamerscore);
                                    console.log('tag again: ' + profile.gamertag);
                                });

                        } else if (signInResult.status == Microsoft.Xbox.Services.System.SignInStatus.userCancel) {
                            console.log('user canceled sign in');
                        } else {
                            console.log('could not sign in: ' + signInResult);
                        }
                    }, error => {
                        console.log('sign in error: ' + error);
                    });

            } catch (error) {
                console.log('sign in failed: ' + error);
            }
        });

}
