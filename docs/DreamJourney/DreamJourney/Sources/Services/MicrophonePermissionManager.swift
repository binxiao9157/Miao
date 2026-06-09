import AVFoundation
import UIKit

/// 麦克风权限管理器
final class MicrophonePermissionManager {

    static let shared = MicrophonePermissionManager()

    private init() {}

    /// 请求麦克风权限
    /// - Parameter completion: 回调结果（true=已授权）
    func requestPermission(completion: @escaping (Bool) -> Void) {
        let status = AVAudioSession.sharedInstance().recordPermission

        switch status {
        case .granted:
            completion(true)
        case .denied:
            completion(false)
        case .undetermined:
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async {
                    completion(granted)
                }
            }
        @unknown default:
            completion(false)
        }
    }

    /// 检查当前是否有麦克风权限
    var isAuthorized: Bool {
        return AVAudioSession.sharedInstance().recordPermission == .granted
    }

    /// 显示权限被拒绝的引导弹窗
    func showPermissionDeniedAlert(on viewController: UIViewController) {
        let alert = UIAlertController(
            title: "需要麦克风权限",
            message: "寻梦环游需要使用麦克风来记录您的语音回忆。请在系统设置中开启麦克风权限。",
            preferredStyle: .alert
        )

        alert.addAction(UIAlertAction(title: "取消", style: .cancel))
        alert.addAction(UIAlertAction(title: "前往设置", style: .default) { _ in
            if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(settingsURL)
            }
        })

        viewController.present(alert, animated: true)
    }
}
