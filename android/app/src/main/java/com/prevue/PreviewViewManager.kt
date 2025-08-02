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

class PreviewViewManager : SimpleViewManager<ReactRootView>() {
    companion object {
        const val REACT_CLASS = "PreviewView"
        private const val TAG = "PreviewViewManager"
        private const val DEFAULT_COMPONENT_NAME = "AwesomeProject"
        private const val DEFAULT_BUNDLE_PATH = "assets://awesome/complete-app.bundle"
        private const val PREVUE_COMPONENT_NAME = "PreVue"
        private const val PREVUE_BUNDLE_PATH = "assets://index.android.bundle"
        private const val MAX_RETRY_ATTEMPTS = 3
    }

    // Separate instance managers for each component
    private val instanceManagers = mutableMapOf<String, ReactInstanceManager>()
    private val startedViews = mutableSetOf<ReactRootView>()
    private val initializationStates = mutableMapOf<String, Boolean>()
    private val retryAttempts = mutableMapOf<String, Int>()
    private var currentComponentName: String = DEFAULT_COMPONENT_NAME

    override fun getName(): String = REACT_CLASS

    private fun createPreviewHost(application: Application, bundlePath: String): ReactNativeHost {
        return object : DefaultReactNativeHost(application) {
            override fun getUseDeveloperSupport(): Boolean = false
            override fun getJSBundleFile(): String? = bundlePath
            override fun getPackages(): List<ReactPackage> {
                val packages = PackageList(this).packages.toMutableList()
                // Add our bridge package to provide native functionality
                packages.add(EmbeddedAppBridgePackage())
                return packages
            }
            override fun getJSMainModuleName(): String = "index"
            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }
    }

    private fun getOrCreateInstanceManager(application: Application, componentName: String): ReactInstanceManager {
        return instanceManagers.getOrPut(componentName) {
            val bundlePath = if (componentName == PREVUE_COMPONENT_NAME) {
                PREVUE_BUNDLE_PATH
            } else {
                DEFAULT_BUNDLE_PATH
            }
            
            Log.d(TAG, "Creating new instance manager for $componentName with bundle: $bundlePath")
            val previewHost = createPreviewHost(application, bundlePath)
            previewHost.reactInstanceManager
        }
    }

    private fun preloadInstanceManager(application: Application, componentName: String) {
        if (initializationStates[componentName] == true) {
            return // Already initialized
        }

        val instanceManager = getOrCreateInstanceManager(application, componentName)
        if (instanceManager.currentReactContext != null) {
            initializationStates[componentName] = true
            return
        }

        Log.d(TAG, "Preloading instance manager for $componentName")
        initializationStates[componentName] = false
        
        instanceManager.addReactInstanceEventListener(object : ReactInstanceEventListener {
            override fun onReactContextInitialized(context: ReactContext) {
                Log.d(TAG, "Preloaded ReactContext initialized for: $componentName")
                initializationStates[componentName] = true
                retryAttempts[componentName] = 0 // Reset retry attempts on success
            }
        })
        
        instanceManager.createReactContextInBackground()
    }

    override fun createViewInstance(reactContext: ThemedReactContext): ReactRootView {
        Log.d(TAG, "createViewInstance called for component: $currentComponentName")

        val application: Application = reactContext.currentActivity?.application
            ?: (reactContext.applicationContext as Application)

        // Preload the current component's instance manager
        preloadInstanceManager(application, currentComponentName)

        val instanceManager = getOrCreateInstanceManager(application, currentComponentName)
        val rootView = ReactRootView(reactContext)

        // Ensure proper Activity context for native components
        val currentActivity = reactContext.currentActivity
        if (currentActivity != null) {
            // Set the Activity context for the instance manager to enable native components
            try {
                instanceManager.onHostResume(currentActivity)
                Log.d(TAG, "Set Activity context for $currentComponentName")
            } catch (e: Exception) {
                Log.w(TAG, "Could not set Activity context", e)
            }
        }

        if (instanceManager.currentReactContext != null && initializationStates[currentComponentName] == true) {
            Log.d(TAG, "ReactContext ready, starting app immediately: $currentComponentName")
            startReactApplication(rootView, instanceManager)
        } else {
            Log.d(TAG, "ReactContext not ready, setting up listener for: $currentComponentName")
            setupReactContextListener(rootView, instanceManager, currentComponentName)
        }

        return rootView
    }

    private fun setupReactContextListener(rootView: ReactRootView, instanceManager: ReactInstanceManager, componentName: String) {
        instanceManager.addReactInstanceEventListener(object : ReactInstanceEventListener {
            override fun onReactContextInitialized(context: ReactContext) {
                Log.d(TAG, "ReactContext initialized for: $componentName")
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
                    startReactApplication(rootView, instanceManager)
                }
            }
        })
    }

    private fun startReactApplication(rootView: ReactRootView, instanceManager: ReactInstanceManager) {
        try {
            // Ensure the ReactContext is fully ready
            val reactContext = instanceManager.currentReactContext
            if (reactContext != null) {
                Log.d(TAG, "ReactContext is ready, starting app: $currentComponentName")
                
                // Start the React application
                rootView.startReactApplication(instanceManager, currentComponentName, null)
                startedViews.add(rootView)
                Log.d(TAG, "Successfully started React application: $currentComponentName")
                
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
        
        // Only destroy instance managers if no views are left
        if (startedViews.isEmpty()) {
            Log.d(TAG, "No views left, cleaning up all instance managers")
            instanceManagers.values.forEach { instanceManager ->
                try {
                    val activity = view.context as? Activity
                    if (activity != null) {
                        instanceManager.onHostPause(activity)
                        instanceManager.onHostDestroy(activity)
                    }
                } catch (t: Throwable) {
                    Log.w(TAG, "Error during instance manager cleanup", t)
                }
            }
            instanceManagers.clear()
            initializationStates.clear()
            retryAttempts.clear()
        }
    }

    @ReactProp(name = "componentName")
    fun setComponentName(view: ReactRootView, name: String?) {
        val newComponent = name ?: DEFAULT_COMPONENT_NAME
        if (newComponent == currentComponentName) {
            Log.d(TAG, "componentName unchanged: $newComponent")
            return
        }

        Log.d(TAG, "setComponentName called. Switching from $currentComponentName to $newComponent")
        currentComponentName = newComponent

        val application: Application = (view.context.applicationContext as Application)
        
        // Preload the new component's instance manager
        preloadInstanceManager(application, newComponent)
        
        val instanceManager = getOrCreateInstanceManager(application, newComponent)
        
        // Ensure Activity context is set for the new component
        val currentActivity = view.context as? Activity
        if (currentActivity != null) {
            try {
                instanceManager.onHostResume(currentActivity)
                Log.d(TAG, "Set Activity context for new component: $newComponent")
            } catch (e: Exception) {
                Log.w(TAG, "Could not set Activity context for new component", e)
            }
        }
        
        if (instanceManager.currentReactContext != null && initializationStates[newComponent] == true) {
            Log.d(TAG, "New component's ReactContext ready, starting immediately")
            startReactApplication(view, instanceManager)
        } else {
            Log.d(TAG, "New component's ReactContext not ready, setting up listener")
            setupReactContextListener(view, instanceManager, newComponent)
        }
    }
}
