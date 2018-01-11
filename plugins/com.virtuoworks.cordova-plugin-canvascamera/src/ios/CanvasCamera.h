/**
* CanvasCamera.js
* PhoneGap iOS and Android Cordova Plugin to capture Camera streaming into an HTML5 Canvas.
*
* VirtuoWorks <contact@virtuoworks.com>.
*
* MIT License
*/

#import <Cordova/CDVPlugin.h>
#import <UIKit/UIKit.h>
#import <CoreMedia/CoreMedia.h>
#import <CoreVideo/CoreVideo.h>
#import <AVFoundation/AVFoundation.h>
#import <ImageIO/ImageIO.h>
#import <AssetsLibrary/AssetsLibrary.h>

@interface CanvasCamera : CDVPlugin <AVCaptureVideoDataOutputSampleBufferDelegate>

- (void)startCapture:(CDVInvokedUrlCommand *)command;
- (void)stopCapture:(CDVInvokedUrlCommand *)command;
- (void)flashMode:(CDVInvokedUrlCommand *)command;
- (void)cameraPosition:(CDVInvokedUrlCommand *)command;

@end
