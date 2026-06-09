import UIKit

// TPRD v5.0 - Toast 通知组件
final class TGToast {

    enum ToastType {
        case success  // 绿色#52c41a + ✓图标，2秒
        case error    // 红色#ff4d4f + ✕图标，3秒
        case info     // 灰色rgba(0,0,0,0.8)，2秒
    }

    private struct ToastConfig {
        let bgColor: UIColor
        let icon: String?
        let duration: TimeInterval
    }

    private static var currentToast: UIView?

    static func show(type: ToastType = .info, message: String) {
        DispatchQueue.main.async {
            currentToast?.removeFromSuperview()

            guard let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) else { return }

            let config = configFor(type: type)
            let container = makeContainer(config: config, message: message)

            let safeTop = window.safeAreaInsets.top
            let yPos = safeTop + 80

            container.frame = CGRect(
                x: (window.bounds.width - container.frame.width) / 2,
                y: yPos,
                width: container.frame.width,
                height: container.frame.height
            )
            container.alpha = 0
            window.addSubview(container)
            currentToast = container

            UIView.animate(withDuration: 0.25) {
                container.alpha = 1
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + config.duration) {
                UIView.animate(withDuration: 0.25, animations: {
                    container.alpha = 0
                }) { _ in
                    container.removeFromSuperview()
                    if currentToast === container { currentToast = nil }
                }
            }
        }
    }

    private static func configFor(type: ToastType) -> ToastConfig {
        switch type {
        case .success: return ToastConfig(bgColor: TGColors.successGreen, icon: "✓", duration: 2)
        case .error:   return ToastConfig(bgColor: TGColors.errorRed, icon: "✕", duration: 3)
        case .info:    return ToastConfig(bgColor: UIColor.black.withAlphaComponent(0.8), icon: nil, duration: 2)
        }
    }

    private static func makeContainer(config: ToastConfig, message: String) -> UIView {
        let container = UIView()
        container.backgroundColor = config.bgColor
        container.layer.cornerRadius = 8
        container.clipsToBounds = true

        let label = UILabel()
        label.textColor = .white
        label.font = .systemFont(ofSize: 15)
        label.numberOfLines = 0

        if let icon = config.icon {
            label.text = "\(icon)  \(message)"
        } else {
            label.text = message
        }

        container.addSubview(label)
        label.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            label.topAnchor.constraint(equalTo: container.topAnchor, constant: 12),
            label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -12),
            label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 16),
            label.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -16)
        ])

        let maxWidth: CGFloat = UIScreen.main.bounds.width * 0.8
        let size = label.systemLayoutSizeFitting(CGSize(width: maxWidth - 32, height: .infinity),
                                                 withHorizontalFittingPriority: .defaultHigh,
                                                 verticalFittingPriority: .fittingSizeLevel)
        container.frame = CGRect(x: 0, y: 0, width: min(size.width + 32, maxWidth), height: size.height + 24)
        return container
    }
}
