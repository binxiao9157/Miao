import UIKit

// MARK: - FootprintNotificationBanner
// 梦想足迹页底部通知横幅（深棕色背景，白色文字，滑入/滑出动画）
final class FootprintNotificationBanner: UIView {

    // MARK: - UI
    private let iconLabel: UILabel = {
        let l = UILabel()
        l.text = "✦"
        l.font = .systemFont(ofSize: 18, weight: .bold)
        l.textColor = .warmIconYellow
        return l
    }()

    private let messageLabel: UILabel = {
        let l = UILabel()
        l.text = "一段新的珍贵回忆"
        l.font = .systemFont(ofSize: 15, weight: .bold)
        l.textColor = .white
        l.numberOfLines = 1
        return l
    }()

    private let detailButton: UIButton = {
        let b = UIButton(type: .system)
        b.setTitle("查看详情", for: .normal)
        b.setTitleColor(.white, for: .normal)
        b.titleLabel?.font = .systemFont(ofSize: 13, weight: .medium)
        b.backgroundColor = UIColor.white.withAlphaComponent(0.2)
        b.layer.cornerRadius = 10
        b.layer.masksToBounds = true
        b.contentEdgeInsets = UIEdgeInsets(top: 5, left: 12, bottom: 5, right: 12)
        return b
    }()

    // MARK: - Properties
    var onDetailTapped: (() -> Void)?
    private var dismissTimer: Timer?

    // MARK: - Init
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }

    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Setup
    private func setupView() {
        backgroundColor = .warmDeep
        // 下方两角圆角 16px（顶部展示时朝下的两角）
        layer.cornerRadius = 16
        layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]

        addSubview(iconLabel)
        addSubview(messageLabel)
        addSubview(detailButton)
        [iconLabel, messageLabel, detailButton].forEach { $0.translatesAutoresizingMaskIntoConstraints = false }

        NSLayoutConstraint.activate([
            iconLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 20),
            iconLabel.centerYAnchor.constraint(equalTo: centerYAnchor),

            messageLabel.leadingAnchor.constraint(equalTo: iconLabel.trailingAnchor, constant: 10),
            messageLabel.centerYAnchor.constraint(equalTo: centerYAnchor),
            messageLabel.trailingAnchor.constraint(lessThanOrEqualTo: detailButton.leadingAnchor, constant: -8),

            detailButton.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -20),
            detailButton.centerYAnchor.constraint(equalTo: centerYAnchor),
        ])

        detailButton.addTarget(self, action: #selector(detailTapped), for: .touchUpInside)
    }

    // MARK: - Show/Hide
    /// 在父视图中展示横幅（从顶部滑入，3秒后自动消失）
    func show(in parentView: UIView, topOffset: CGFloat = 60) {
        parentView.addSubview(self)
        let bannerHeight: CGFloat = 64
        let bannerWidth = parentView.bounds.width - 32

        // 初始位置：顶部外侧（完全不可见）
        frame = CGRect(
            x: 16,
            y: -bannerHeight,
            width: bannerWidth,
            height: bannerHeight
        )

        let targetY = topOffset

        // 300ms 滑入动画
        UIView.animate(withDuration: 0.3, delay: 0, options: .curveEaseOut) {
            self.frame.origin.y = targetY
        } completion: { _ in
            // 3秒后自动消失
            self.dismissTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: false) { [weak self] _ in
                self?.dismiss()
            }
        }
    }

    /// 手动关闭横幅（300ms 滑出，向上）
    func dismiss(completion: (() -> Void)? = nil) {
        dismissTimer?.invalidate()
        dismissTimer = nil

        UIView.animate(withDuration: 0.3, delay: 0, options: .curveEaseIn) {
            self.frame.origin.y = -(self.bounds.height + 20)
        } completion: { _ in
            self.removeFromSuperview()
            completion?()
        }
    }

    // MARK: - Actions
    @objc private func detailTapped() {
        dismiss {
            self.onDetailTapped?()
        }
    }

    // MARK: - Configure
    func configure(message: String) {
        messageLabel.text = message
    }
}
