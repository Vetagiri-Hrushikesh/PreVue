//
//  PreviewViewManager.swift
//  PreVue
//
//  Created by vetagiri on 31/07/25.
//

import Foundation
import UIKit
import React

@objc(PreviewViewManager)
class PreviewViewManager: RCTViewManager {

  override static func requiresMainQueueSetup() -> Bool {
    return true // we are instantiating UIKit views
  }

  override func view() -> UIView! {
    // Load the pre-bundled AwesomeProject preview JS
    guard let bundleURL = Bundle.main.url(forResource: "AwesomeProjectPreview", withExtension: "jsbundle") else {
      // Fallback: you could log or show an error view
      return UIView()
    }

    let rootView = RCTRootView(
      bundleURL: bundleURL,
      moduleName: "AwesomeProject", // must match the registration name in AwesomeProject's app.json/index.tsx
      initialProperties: nil,
      launchOptions: nil
    )
    return rootView
  }
}
