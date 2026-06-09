//
//  AppDelegate.swift
//  DreamJourney
//

import UIKit
import SpeechEngineToB
import AMapFoundationKit
import MAMapKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // 火山引擎语音 SDK 环境准备
        SpeechEngine.prepareEnvironment()

        // ⚠️ AMap3DMap 8.1.0+ 强制要求：必须在创建 MAMapView 之前调用隐私合规接口，
        //    否则 MAMapView(frame:) 会返回 nil，地图黑屏。
        MAMapView.updatePrivacyShow(.didShow, privacyInfo: .didContain)
        MAMapView.updatePrivacyAgree(.didAgree)

        // 初始化高德地图 SDK
        if let apiKey = Bundle.main.object(forInfoDictionaryKey: "AMapAPIKey") as? String, apiKey != "YOUR_AMAP_KEY" {
            AMapServices.shared().apiKey = apiKey
        }
        return true
    }

    // MARK: - UISceneSession Lifecycle

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    func application(_ application: UIApplication,
                     didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
    }
}
