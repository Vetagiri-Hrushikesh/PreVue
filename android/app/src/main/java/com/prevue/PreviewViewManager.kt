package com.prevue

import android.app.Activity
import android.app.Application
import android.content.Context
import android.util.Log
import android.view.MotionEvent
import android.view.View
import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
import com.facebook.react.bridge.ReactContext
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.PackageList
import com.facebook.react.ReactRootView
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import android.graphics.Rect
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.facebook.react.common.MapBuilder
import java.io.*
import java.net.HttpURLConnection
import java.net.URL
import java.util.zip.ZipInputStream
import java.util.concurrent.Executors
import java.util.concurrent.ExecutorService

class PreviewViewManager : SimpleViewManager<ReactRootView>() {
    companion object {
        const val REACT_CLASS = "PreviewView"
        private const val TAG = "PreviewViewManager"
        private const val MAX_RETRY_ATTEMPTS = 3
        private const val CACHE_DIR_NAME = "preview_cache"
    }

    // Dynamic instance managers for each component
    private val instanceManagers = mutableMapOf<String, ReactInstanceManager>()
    private val startedViews = mutableSetOf<ReactRootView>()
    private val initializationStates = mutableMapOf<String, Boolean>()
    private val retryAttempts = mutableMapOf<String, Int>()
    private var currentComponentName: String = ""
    private var currentBundleUrl: String? = null
    private val executor: ExecutorService = Executors.newSingleThreadExecutor()

    override fun getName(): String = REACT_CLASS

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        return MapBuilder.of(
            "onDownloadProgress", MapBuilder.of("registrationName", "onDownloadProgress"),
            "onPreviewReady", MapBuilder.of("registrationName", "onPreviewReady"),
            "onError", MapBuilder.of("registrationName", "onError")
        )
    }

    private fun getCacheDir(context: Context): File {
        val cacheDir = File(context.cacheDir, CACHE_DIR_NAME)
        if (!cacheDir.exists()) {
            cacheDir.mkdirs()
        }
        return cacheDir
    }

    private fun clearCache(context: Context) {
        try {
            val cacheDir = getCacheDir(context)
            if (cacheDir.exists()) {
                cacheDir.deleteRecursively()
                cacheDir.mkdirs()
                Log.d(TAG, "Cache cleared successfully")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing cache", e)
        }
    }

    private fun clearAllPreviousBundles(context: Context) {
        try {
            Log.d(TAG, "🧹 Clearing ALL previous bundles and instance managers")
            
            // 1. Clear all React instance managers
            instanceManagers.values.forEach { instanceManager ->
                try {
                    val activity = context as? Activity
                    if (activity != null) {
                        instanceManager.onHostPause(activity)
                        instanceManager.onHostDestroy(activity)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Error destroying instance manager", e)
                }
            }
            instanceManagers.clear()
            initializationStates.clear()
            retryAttempts.clear()
            startedViews.clear()
            
            // 2. Clear all cached bundles
            clearCache(context)
            
            Log.d(TAG, "✅ All previous bundles and instance managers cleared")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing previous bundles", e)
        }
    }

    private fun downloadAndExtractBundle(context: Context, bundleUrl: String, componentName: String, rootView: ReactRootView) {
        executor.execute {
            try {
                Log.d(TAG, "Starting download from: $bundleUrl")
                
                // Clear ALL previous bundles and instance managers
                clearAllPreviousBundles(context)
                
                val url = URL(bundleUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 30000 // 30 seconds timeout
                connection.readTimeout = 60000 // 60 seconds timeout
                connection.connect()
                
                val responseCode = connection.responseCode
                Log.d(TAG, "HTTP Response Code: $responseCode")
                
                if (responseCode != HttpURLConnection.HTTP_OK) {
                    throw Exception("HTTP Error: $responseCode - ${connection.responseMessage}")
                }
                
                val contentLength = connection.contentLength
                Log.d(TAG, "Content Length: $contentLength bytes")
                
                if (contentLength <= 0) {
                    Log.w(TAG, "Content length is unknown or zero")
                }
                
                val inputStream = connection.inputStream
                
                val cacheDir = getCacheDir(context)
                val zipFile = File(cacheDir, "$componentName-bundle.zip")
                val outputStream = FileOutputStream(zipFile)
                
                val buffer = ByteArray(8192)
                var totalBytesRead = 0
                var bytesRead: Int
                var lastProgressUpdate = 0
                var lastProgressTime = 0L
                
                Log.d(TAG, "Starting download loop...")
                
                while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                    outputStream.write(buffer, 0, bytesRead)
                    totalBytesRead += bytesRead
                    
                    // Log every 1MB or every 5 seconds
                    val currentTime = System.currentTimeMillis()
                    if (contentLength > 0) {
                        val progress = (totalBytesRead * 100 / contentLength)
                        
                        if (progress != lastProgressUpdate || (currentTime - lastProgressTime) > 5000) {
                            Log.d(TAG, "Download progress: $progress% ($totalBytesRead/$contentLength bytes)")
                            lastProgressUpdate = progress
                            lastProgressTime = currentTime
                            
                            // Send progress update to React Native
                            rootView.post {
                                sendDownloadProgressEvent(rootView, progress)
                            }
                        }
                    } else {
                        // If content length is unknown, log every 1MB
                        if (totalBytesRead % (1024 * 1024) == 0) {
                            Log.d(TAG, "Downloaded: ${totalBytesRead / (1024 * 1024)}MB")
                        }
                    }
                }
                
                Log.d(TAG, "Download completed. Total bytes: $totalBytesRead")
                
                // Send final progress update
                rootView.post {
                    sendDownloadProgressEvent(rootView, 100)
                }
                
                inputStream.close()
                outputStream.close()
                connection.disconnect()
                
                Log.d(TAG, "Download completed, extracting...")
                
                // Extract the zip file
                extractBundle(zipFile, cacheDir, componentName)
                
                // Start the React app with the extracted bundle
                rootView.post {
                    startReactAppWithExtractedBundle(context, componentName, rootView)
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Error downloading/extracting bundle", e)
                Log.e(TAG, "Bundle URL: $bundleUrl")
                Log.e(TAG, "Component Name: $componentName")
                rootView.post {
                    sendErrorEvent(rootView, "Failed to download or extract bundle: ${e.message}")
                }
            }
        }
    }

    private fun extractBundle(zipFile: File, cacheDir: File, componentName: String) {
        try {
            val zipInputStream = ZipInputStream(FileInputStream(zipFile))
            var entry = zipInputStream.nextEntry
            
            while (entry != null) {
                val entryName = entry.name
                val outputFile = File(cacheDir, entryName)
                
                if (entry.isDirectory) {
                    outputFile.mkdirs()
                } else {
                    outputFile.parentFile?.mkdirs()
                    val outputStream = FileOutputStream(outputFile)
                    
                    val buffer = ByteArray(8192)
                    var bytesRead: Int
                    while (zipInputStream.read(buffer).also { bytesRead = it } != -1) {
                        outputStream.write(buffer, 0, bytesRead)
                    }
                    
                    outputStream.close()
                    Log.d(TAG, "Extracted: $entryName")
                }
                
                zipInputStream.closeEntry()
                entry = zipInputStream.nextEntry
            }
            
            zipInputStream.close()
            zipFile.delete() // Clean up zip file
            Log.d(TAG, "Bundle extraction completed")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting bundle", e)
            throw e
        }
    }

    private fun findBundleFile(cacheDir: File): File? {
        try {
            // Since we clear all previous bundles, there should only be one bundle file
            // Look for complete-app.bundle in any subdirectory
            cacheDir.walkTopDown().forEach { file ->
                if (file.isFile && file.name == "complete-app.bundle") {
                    Log.d(TAG, "Found current bundle file: ${file.absolutePath}")
                    return file
                }
            }
            Log.w(TAG, "No complete-app.bundle file found in cache directory")
            return null
        } catch (e: Exception) {
            Log.e(TAG, "Error finding bundle file", e)
            return null
        }
    }

    private fun startReactAppWithExtractedBundle(context: Context, componentName: String, rootView: ReactRootView) {
        try {
            val application = context.applicationContext as Application
            val cacheDir = getCacheDir(context)
            
            // Find the actual bundle file (it might be in a different folder than componentName)
            val bundleFile = findBundleFile(cacheDir)
            
            if (bundleFile == null) {
                Log.e(TAG, "Bundle file not found in cache directory: ${cacheDir.absolutePath}")
                sendErrorEvent(rootView, "Bundle file not found after extraction")
                return
            }
            
            if (!bundleFile.canRead()) {
                Log.e(TAG, "Bundle file cannot be read: ${bundleFile.absolutePath}")
                sendErrorEvent(rootView, "Bundle file cannot be read")
                return
            }
            
            val bundlePath = bundleFile.absolutePath
            Log.d(TAG, "Starting React app with bundle: $bundlePath")
            Log.d(TAG, "Bundle file size: ${bundleFile.length()} bytes")
            Log.d(TAG, "Bundle file readable: ${bundleFile.canRead()}")
            
            val instanceManager = getOrCreateInstanceManager(application, componentName, bundlePath)
            
            // Ensure Activity context is set for the instance manager
            val currentActivity = rootView.context as? Activity
            if (currentActivity != null) {
                try {
                    instanceManager.onHostResume(currentActivity)
                    Log.d(TAG, "Set Activity context for $componentName")
                } catch (e: Exception) {
                    Log.w(TAG, "Could not set Activity context", e)
                }
            }
            
            if (instanceManager.currentReactContext != null && initializationStates[componentName] == true) {
                Log.d(TAG, "ReactContext ready, starting app immediately: $componentName")
                startReactApplication(rootView, instanceManager)
                sendPreviewReadyEvent(rootView)
            } else {
                Log.d(TAG, "ReactContext not ready, setting up listener for: $componentName")
                Log.d(TAG, "Current ReactContext: ${instanceManager.currentReactContext}")
                Log.d(TAG, "Initialization state: ${initializationStates[componentName]}")
                
                // Force create React context in background
                Log.d(TAG, "Creating React context in background for: $componentName")
                try {
                    instanceManager.createReactContextInBackground()
                    Log.d(TAG, "React context creation initiated successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Error creating React context in background", e)
                    sendErrorEvent(rootView, "Failed to create React context: ${e.message}")
                }
                
                setupReactContextListener(rootView, instanceManager, componentName)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting React app with extracted bundle", e)
            sendErrorEvent(rootView, "Failed to start app: ${e.message}")
        }
    }

    private fun sendDownloadProgressEvent(rootView: ReactRootView, progress: Int) {
        try {
            val reactContext = rootView.context as? ReactContext
            reactContext?.getJSModule(RCTEventEmitter::class.java)
                ?.receiveEvent(rootView.id, "onDownloadProgress", Arguments.createMap().apply {
                    putInt("progress", progress)
                })
        } catch (e: Exception) {
            Log.e(TAG, "Error sending download progress event", e)
        }
    }

    private fun sendPreviewReadyEvent(rootView: ReactRootView) {
        try {
            val reactContext = rootView.context as? ReactContext
            reactContext?.getJSModule(RCTEventEmitter::class.java)
                ?.receiveEvent(rootView.id, "onPreviewReady", Arguments.createMap())
        } catch (e: Exception) {
            Log.e(TAG, "Error sending preview ready event", e)
        }
    }

    private fun sendErrorEvent(rootView: ReactRootView, message: String) {
        try {
            val reactContext = rootView.context as? ReactContext
            reactContext?.getJSModule(RCTEventEmitter::class.java)
                ?.receiveEvent(rootView.id, "onError", Arguments.createMap().apply {
                    putString("message", message)
                })
        } catch (e: Exception) {
            Log.e(TAG, "Error sending error event", e)
        }
    }

    private fun createPreviewHost(application: Application, bundlePath: String): ReactNativeHost {
        return object : DefaultReactNativeHost(application) {
            override fun getUseDeveloperSupport(): Boolean = false
            override fun getJSBundleFile(): String? = bundlePath
            override fun getPackages(): List<ReactPackage> {
                val packages = PackageList(this).packages.toMutableList()
                // Add our bridge package to provide native functionality for embedded apps
                packages.add(EmbeddedAppBridgePackage())
                return packages
            }
            override fun getJSMainModuleName(): String = "index"
            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }
    }

    private fun getOrCreateInstanceManager(application: Application, componentName: String, bundlePath: String): ReactInstanceManager {
        return instanceManagers.getOrPut(componentName) {
            Log.d(TAG, "Creating new instance manager for $componentName with bundle: $bundlePath")
            val previewHost = createPreviewHost(application, bundlePath)
            previewHost.reactInstanceManager
        }
    }

    override fun createViewInstance(reactContext: ThemedReactContext): ReactRootView {
        Log.d(TAG, "createViewInstance called for component: $currentComponentName")

        val rootView = ReactRootView(reactContext)

        // Don't start download here - wait for both componentName and bundleUrl to be set via React props
        // This prevents downloads with stale/incorrect parameters
        Log.d(TAG, "PreviewView created, waiting for componentName and bundleUrl to be set via React props")

        return rootView
    }

    private fun setupReactContextListener(rootView: ReactRootView, instanceManager: ReactInstanceManager, componentName: String) {
        Log.d(TAG, "Setting up React context listener for: $componentName")
        instanceManager.addReactInstanceEventListener(object : ReactInstanceEventListener {
            override fun onReactContextInitialized(context: ReactContext) {
                Log.d(TAG, "🎉 ReactContext initialized for: $componentName")
                Log.d(TAG, "ReactContext: $context")
                initializationStates[componentName] = true
                retryAttempts[componentName] = 0 // Reset retry attempts on success
                
                // Ensure Activity context is set after ReactContext is ready
                val currentActivity = rootView.context as? Activity
                if (currentActivity != null) {
                    try {
                        instanceManager.onHostResume(currentActivity)
                        Log.d(TAG, "Set Activity context after ReactContext initialization for $componentName")
                    } catch (e: Exception) {
                        Log.w(TAG, "Could not set Activity context after initialization", e)
                    }
                }
                
                // Ensure the root view is ready
                rootView.post {
                    Log.d(TAG, "Root view configured for: $componentName")
                }
                
                if (!startedViews.contains(rootView)) {
                    Log.d(TAG, "🚀 Starting React application for: $componentName")
                    startReactApplication(rootView, instanceManager)
                    sendPreviewReadyEvent(rootView)
                } else {
                    Log.d(TAG, "React application already started for: $componentName")
                }
            }
        })
    }

    private fun startReactApplication(rootView: ReactRootView, instanceManager: ReactInstanceManager) {
        try {
            // Ensure the ReactContext is fully ready
            val reactContext = instanceManager.currentReactContext
            Log.d(TAG, "🔍 startReactApplication called for: $currentComponentName")
            Log.d(TAG, "ReactContext: $reactContext")
            
            if (reactContext != null) {
                Log.d(TAG, "✅ ReactContext is ready, starting app: $currentComponentName")
                
                // Start the React application
                rootView.startReactApplication(instanceManager, currentComponentName, null)
                startedViews.add(rootView)
                Log.d(TAG, "🎯 Successfully started React application: $currentComponentName")
                
                // Ensure proper view hierarchy and touch handling
                rootView.postDelayed({
                    // Force layout update to ensure proper view hierarchy
                    rootView.requestLayout()
                    rootView.invalidate()
                    Log.d(TAG, "React app started successfully for: $currentComponentName")
                }, 300L) // Delay to ensure React app is fully loaded
                
            } else {
                Log.e(TAG, "ReactContext is null, cannot start app: $currentComponentName")
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error starting React application", e)
            
            // Implement retry mechanism
            val currentAttempts = retryAttempts[currentComponentName] ?: 0
            if (currentAttempts < MAX_RETRY_ATTEMPTS) {
                retryAttempts[currentComponentName] = currentAttempts + 1
                Log.d(TAG, "Retrying React application start. Attempt ${currentAttempts + 1}/$MAX_RETRY_ATTEMPTS")
                
                // Retry after a short delay
                rootView.postDelayed({
                    if (!startedViews.contains(rootView)) {
                        startReactApplication(rootView, instanceManager)
                    }
                }, 500L)
            } else {
                Log.e(TAG, "Max retry attempts reached for $currentComponentName")
            }
        }
    }

    override fun onDropViewInstance(view: ReactRootView) {
        super.onDropViewInstance(view)
        Log.d(TAG, "onDropViewInstance - tearing down instance for view: $view")
        startedViews.remove(view)
        
        // Since we clear everything on each new preview, we don't need complex cleanup logic here
        // The clearAllPreviousBundles function handles all cleanup when a new preview starts
    }

    @ReactProp(name = "componentName")
    fun setComponentName(view: ReactRootView, name: String?) {
        val newComponent = name ?: ""
        if (newComponent == currentComponentName) {
            Log.d(TAG, "componentName unchanged: $newComponent")
            return
        }

        Log.d(TAG, "setComponentName called. Switching from '$currentComponentName' to '$newComponent'")
        currentComponentName = newComponent

        // If we have a bundle URL, start the download process now that we have the component name
        if (currentBundleUrl != null && newComponent.isNotEmpty()) {
            Log.d(TAG, "Bundle URL present, starting download process for component: $newComponent")
            downloadAndExtractBundle(view.context, currentBundleUrl!!, newComponent, view)
        } else if (currentBundleUrl != null && newComponent.isEmpty()) {
            Log.w(TAG, "Bundle URL present but component name is empty")
        } else {
            Log.d(TAG, "No bundle URL present, component name updated but no action taken")
        }
    }

    @ReactProp(name = "bundleUrl")
    fun setBundleUrl(view: ReactRootView, bundleUrl: String?) {
        Log.d(TAG, "setBundleUrl called with: $bundleUrl")
        currentBundleUrl = bundleUrl
        
        // Only start download if both componentName and bundleUrl are available
        if (bundleUrl != null && currentComponentName.isNotEmpty()) {
            Log.d(TAG, "Starting download process for bundle URL: $bundleUrl with component: $currentComponentName")
            downloadAndExtractBundle(view.context, bundleUrl, currentComponentName, view)
        } else if (bundleUrl != null && currentComponentName.isEmpty()) {
            Log.w(TAG, "Bundle URL provided but component name is empty, waiting for component name")
        } else {
            Log.d(TAG, "Bundle URL cleared")
        }
    }
}
