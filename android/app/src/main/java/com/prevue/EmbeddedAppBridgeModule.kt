package com.prevue

import android.content.Intent
import android.provider.MediaStore
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class EmbeddedAppBridgeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "EmbeddedAppBridge"
    }

    override fun getName(): String = "EmbeddedAppBridge"

    @ReactMethod
    fun requestCameraAccess(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity != null) {
                val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                if (intent.resolveActivity(activity.packageManager) != null) {
                    activity.startActivityForResult(intent, 1001)
                    promise.resolve(true)
                    Log.d(TAG, "Camera intent launched successfully")
                } else {
                    promise.reject("CAMERA_ERROR", "Camera not available on this device")
                    Log.e(TAG, "Camera not available on device")
                }
            } else {
                promise.reject("ACTIVITY_ERROR", "Activity not available")
                Log.e(TAG, "Activity not available")
            }
        } catch (e: Exception) {
            promise.reject("CAMERA_ERROR", e.message ?: "Unknown camera error")
            Log.e(TAG, "Camera access error: ${e.message}")
        }
    }

    @ReactMethod
    fun requestGalleryAccess(promise: Promise) {
        try {
            val activity = currentActivity
            if (activity != null) {
                val intent = Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI)
                if (intent.resolveActivity(activity.packageManager) != null) {
                    activity.startActivityForResult(intent, 1002)
                    promise.resolve(true)
                    Log.d(TAG, "Gallery intent launched successfully")
                } else {
                    promise.reject("GALLERY_ERROR", "Gallery not available on this device")
                    Log.e(TAG, "Gallery not available on device")
                }
            } else {
                promise.reject("ACTIVITY_ERROR", "Activity not available")
                Log.e(TAG, "Activity not available")
            }
        } catch (e: Exception) {
            promise.reject("GALLERY_ERROR", e.message ?: "Unknown gallery error")
            Log.e(TAG, "Gallery access error: ${e.message}")
        }
    }
}