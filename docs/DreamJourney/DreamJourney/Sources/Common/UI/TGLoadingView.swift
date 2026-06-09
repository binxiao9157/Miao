import UIKit

// TPRD v5.0 - 全局加载视图（转圈 40px + 骨架屏占位）
final class TGLoadingView {

    private static var loadingView: UIView?

    // MARK: - 全屏转圈加载
    static func show(in view: UIView? = nil) {
        DispatchQueue.main.async {
            let target: UIView
            if let view = view {
                target = view
            } else if let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) {
                target = window
            } else { return }

            guard target.viewWithTag(9901) == nil else { return }

            let bg = UIView()
            bg.tag = 9901
            bg.backgroundColor = UIColor.black.withAlphaComponent(0.1)
            bg.translatesAutoresizingMaskIntoConstraints = false
            target.addSubview(bg)
            NSLayoutConstraint.activate([
                bg.topAnchor.constraint(equalTo: target.topAnchor),
                bg.bottomAnchor.constraint(equalTo: target.bottomAnchor),
                bg.leadingAnchor.constraint(equalTo: target.leadingAnchor),
                bg.trailingAnchor.constraint(equalTo: target.trailingAnchor)
            ])

            let indicator = UIActivityIndicatorView(style: .large)
            indicator.color = TGColors.brandBlue
            indicator.translatesAutoresizingMaskIntoConstraints = false
            indicator.startAnimating()
            bg.addSubview(indicator)
            NSLayoutConstraint.activate([
                indicator.centerXAnchor.constraint(equalTo: bg.centerXAnchor),
                indicator.centerYAnchor.constraint(equalTo: bg.centerYAnchor),
                indicator.widthAnchor.constraint(equalToConstant: 40),
                indicator.heightAnchor.constraint(equalToConstant: 40)
            ])
        }
    }

    static func hide(from view: UIView? = nil) {
        DispatchQueue.main.async {
            let target: UIView
            if let view = view {
                target = view
            } else if let window = UIApplication.shared.windows.first(where: { $0.isKeyWindow }) {
                target = window
            } else { return }
            target.viewWithTag(9901)?.removeFromSuperview()
        }
    }
}

// MARK: - 骨架屏 View
final class TGSkeletonView: UIView {

    private var shimmerLayer: CAGradientLayer?

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = TGColors.skeleton
        layer.cornerRadius = 4
        clipsToBounds = true
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
    }

    func startShimmer() {
        let gradientLayer = CAGradientLayer()
        gradientLayer.frame = CGRect(x: -bounds.width, y: 0, width: bounds.width * 3, height: bounds.height)
        gradientLayer.colors = [
            TGColors.skeleton.cgColor,
            UIColor.white.withAlphaComponent(0.7).cgColor,
            TGColors.skeleton.cgColor
        ]
        gradientLayer.locations = [0, 0.5, 1]
        gradientLayer.startPoint = CGPoint(x: 0, y: 0.5)
        gradientLayer.endPoint = CGPoint(x: 1, y: 0.5)
        layer.addSublayer(gradientLayer)
        shimmerLayer = gradientLayer

        let animation = CABasicAnimation(keyPath: "transform.translation.x")
        animation.fromValue = -bounds.width * 2
        animation.toValue = bounds.width * 2
        animation.duration = 1.4
        animation.repeatCount = .infinity
        gradientLayer.add(animation, forKey: "shimmer")
    }

    func stopShimmer() {
        shimmerLayer?.removeFromSuperlayer()
        shimmerLayer = nil
    }
}
