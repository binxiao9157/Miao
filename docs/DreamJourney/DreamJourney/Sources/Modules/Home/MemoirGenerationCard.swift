import UIKit

// MARK: - MemoirGenerationCard

/// 对话结束后的回忆录生成提示卡片
/// 显示在语音交互 Tab 上方，用户点击后消失并触发回忆录生成流程
final class MemoirGenerationCard: UIView {

    // MARK: - Callback

    /// 用户点击"生成回忆录"按钮
    var onGenerate: (() -> Void)?

    /// 用户点击关闭/稍后
    var onDismiss: (() -> Void)?

    // MARK: - UI

    /// 半透明背景遮罩
    private let overlayView: UIView = {
        let v = UIView()
        v.backgroundColor = UIColor.black.withAlphaComponent(0.3)
        return v
    }()

    /// 卡片主体
    private let cardView: UIView = {
        let v = UIView()
        v.backgroundColor = .warmSurface
        v.layer.cornerRadius = 16
        v.layer.shadowColor = UIColor.black.cgColor
        v.layer.shadowOpacity = 0.12
        v.layer.shadowOffset = CGSize(width: 0, height: 4)
        v.layer.shadowRadius = 16
        return v
    }()

    /// 图标
    private let iconView: UIImageView = {
        let config = UIImage.SymbolConfiguration(pointSize: 32, weight: .medium)
        let iv = UIImageView(image: UIImage(systemName: "book.closed.fill", withConfiguration: config))
        iv.tintColor = .warmAccent
        iv.contentMode = .scaleAspectFit
        return iv
    }()

    /// 标题
    private let titleLabel: UILabel = {
        let l = UILabel()
        l.text = "生成回忆录"
        l.font = .systemFont(ofSize: 20, weight: .bold)
        l.textColor = .warmDeep
        l.textAlignment = .center
        return l
    }()

    /// 副标题
    private let subtitleLabel: UILabel = {
        let l = UILabel()
        l.text = "寻梦环游已记住您说的话，要现在整理成回忆录吗？"
        l.font = .systemFont(ofSize: 15, weight: .regular)
        l.textColor = .warmSubtitle
        l.textAlignment = .center
        l.numberOfLines = 0
        return l
    }()

    /// 生成按钮
    private let generateButton: UIButton = {
        let b = UIButton(type: .system)
        b.setTitle("生成回忆录", for: .normal)
        b.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
        b.setTitleColor(.white, for: .normal)
        b.backgroundColor = .warmAccent
        b.layer.cornerRadius = 12
        return b
    }()

    /// 稍后按钮
    private let laterButton: UIButton = {
        let b = UIButton(type: .system)
        b.setTitle("稍后再说", for: .normal)
        b.titleLabel?.font = .systemFont(ofSize: 15, weight: .regular)
        b.setTitleColor(.warmSubtitle, for: .normal)
        return b
    }()

    // MARK: - Init

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }

    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Setup

    private func setupUI() {
        // 遮罩
        addSubview(overlayView)
        overlayView.translatesAutoresizingMaskIntoConstraints = false

        // 卡片
        addSubview(cardView)
        cardView.translatesAutoresizingMaskIntoConstraints = false

        // 卡片内容
        cardView.addSubview(iconView)
        cardView.addSubview(titleLabel)
        cardView.addSubview(subtitleLabel)
        cardView.addSubview(generateButton)
        cardView.addSubview(laterButton)

        [iconView, titleLabel, subtitleLabel, generateButton, laterButton].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
        }

        NSLayoutConstraint.activate([
            // 遮罩全屏
            overlayView.topAnchor.constraint(equalTo: topAnchor),
            overlayView.leadingAnchor.constraint(equalTo: leadingAnchor),
            overlayView.trailingAnchor.constraint(equalTo: trailingAnchor),
            overlayView.bottomAnchor.constraint(equalTo: bottomAnchor),

            // 卡片居中
            cardView.centerXAnchor.constraint(equalTo: centerXAnchor),
            cardView.centerYAnchor.constraint(equalTo: centerYAnchor, constant: -40),
            cardView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 40),
            cardView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -40),

            // 图标
            iconView.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 28),
            iconView.centerXAnchor.constraint(equalTo: cardView.centerXAnchor),
            iconView.widthAnchor.constraint(equalToConstant: 48),
            iconView.heightAnchor.constraint(equalToConstant: 48),

            // 标题
            titleLabel.topAnchor.constraint(equalTo: iconView.bottomAnchor, constant: 16),
            titleLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -20),

            // 副标题
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            subtitleLabel.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 24),
            subtitleLabel.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -24),

            // 生成按钮
            generateButton.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 24),
            generateButton.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 24),
            generateButton.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -24),
            generateButton.heightAnchor.constraint(equalToConstant: 48),

            // 稍后按钮
            laterButton.topAnchor.constraint(equalTo: generateButton.bottomAnchor, constant: 8),
            laterButton.centerXAnchor.constraint(equalTo: cardView.centerXAnchor),
            laterButton.bottomAnchor.constraint(equalTo: cardView.bottomAnchor, constant: -20),
            laterButton.heightAnchor.constraint(equalToConstant: 36),
        ])

        // 事件
        generateButton.addTarget(self, action: #selector(generateTapped), for: .touchUpInside)
        laterButton.addTarget(self, action: #selector(laterTapped), for: .touchUpInside)
        overlayView.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(laterTapped)))
    }

    // MARK: - Actions

    @objc private func generateTapped() {
        dismissCard {
            self.onGenerate?()
        }
    }

    @objc private func laterTapped() {
        dismissCard {
            self.onDismiss?()
        }
    }

    private func dismissCard(completion: @escaping () -> Void) {
        UIView.animate(withDuration: 0.25, animations: {
            self.alpha = 0
            self.transform = CGAffineTransform(scaleX: 0.95, y: 0.95)
        }) { _ in
            self.removeFromSuperview()
            completion()
        }
    }

    // MARK: - Show

    /// 在指定视图上显示弹窗
    static func show(in parentView: UIView, onGenerate: @escaping () -> Void, onDismiss: (() -> Void)? = nil) {
        let card = MemoirGenerationCard(frame: parentView.bounds)
        card.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        card.onGenerate = onGenerate
        card.onDismiss = onDismiss
        card.alpha = 0
        card.transform = CGAffineTransform(scaleX: 1.05, y: 1.05)

        parentView.addSubview(card)
        UIView.animate(withDuration: 0.3, delay: 0, usingSpringWithDamping: 0.8, initialSpringVelocity: 0, options: []) {
            card.alpha = 1
            card.transform = .identity
        }
    }
}
