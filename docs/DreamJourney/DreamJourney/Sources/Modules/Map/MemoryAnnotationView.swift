import UIKit
import MAMapKit

// MARK: - MemoryAnnotationView：地图上的回忆卡片标注
// 布局参考：[左侧缩略图] [右侧 标题 + 时间] + 底部橙色 pin
final class MemoryAnnotationView: MAAnnotationView {

    private let cardWidth: CGFloat = 180
    private let cardHeight: CGFloat = 64
    private let pinHeight: CGFloat = 20

    /// 点击卡片回调（解决 didSelect 被 SDK 拦截的兜底）
    var onTap: (() -> Void)?

    /// 当前是否处于 NEW 跳动状态
    private var isCurrentlyNew = false

    // 卡片容器
    private lazy var cardView: UIView = {
        let v = UIView()
        v.backgroundColor = .white
        v.layer.cornerRadius = 12
        v.layer.shadowColor = UIColor.black.cgColor
        v.layer.shadowOpacity = 0.18
        v.layer.shadowOffset = CGSize(width: 0, height: 3)
        v.layer.shadowRadius = 6
        return v
    }()

    // 左侧缩略图（48x48 圆角）
    private lazy var photoView: UIImageView = {
        let iv = UIImageView()
        iv.backgroundColor = TGColors.bgGray
        iv.contentMode = .scaleAspectFill
        iv.clipsToBounds = true
        iv.layer.cornerRadius = 8
        return iv
    }()

    // 私密锁角标
    private lazy var privateBadge: UILabel = {
        let l = UILabel()
        l.text = "🔒"
        l.font = .systemFont(ofSize: 11)
        l.isHidden = true
        return l
    }()

    // 标题（如"西溪湿地"）
    private let titleLabel: UILabel = {
        let l = UILabel()
        l.font = .systemFont(ofSize: 15, weight: .semibold)
        l.textColor = TGColors.textPrimary
        l.numberOfLines = 1
        l.lineBreakMode = .byTruncatingTail
        return l
    }()

    // 时间（如"2018年5月"）
    private let timeLabel: UILabel = {
        let l = UILabel()
        l.font = .systemFont(ofSize: 12, weight: .medium)
        l.textColor = .warmAccent  // 橙色
        return l
    }()

    // "最新生成"角标（小胶囊）
    private lazy var newBadge: UILabel = {
        let l = UILabel()
        l.text = "NEW"
        l.font = .systemFont(ofSize: 9, weight: .bold)
        l.textColor = .white
        l.backgroundColor = .warmAccent
        l.textAlignment = .center
        l.layer.cornerRadius = 7
        l.clipsToBounds = true
        l.isHidden = true
        return l
    }()

    // 橙色 pin（底部圆 + 下三角）
    private lazy var pinView: UIView = {
        let v = UIView()
        v.backgroundColor = .clear
        return v
    }()
    private let pinCircle: UIView = {
        let v = UIView()
        v.backgroundColor = .warmAccent
        v.layer.cornerRadius = 7
        return v
    }()
    private let pinTriangle: CAShapeLayer = {
        let layer = CAShapeLayer()
        layer.fillColor = UIColor.warmAccent.cgColor
        return layer
    }()

    // MARK: - Init
    override init!(annotation: MAAnnotation!, reuseIdentifier: String!) {
        super.init(annotation: annotation, reuseIdentifier: reuseIdentifier)
        setupUI()
        // 显式 tap：避免某些场景下 SDK 的 didSelect 不触发
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap))
        tap.cancelsTouchesInView = false
        addGestureRecognizer(tap)
        isUserInteractionEnabled = true
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    @objc private func handleTap() {
        // 点击即视为已读：停止动画 + 隐藏 NEW
        dismissNewBadgeAnimated()
        onTap?()
    }

    // MARK: - Setup UI
    private func setupUI() {
        backgroundColor = .clear
        canShowCallout = false

        addSubview(cardView)
        addSubview(pinView)

        cardView.addSubview(photoView)
        cardView.addSubview(privateBadge)
        cardView.addSubview(titleLabel)
        cardView.addSubview(timeLabel)
        cardView.addSubview(newBadge)

        pinView.addSubview(pinCircle)
        pinView.layer.addSublayer(pinTriangle)

        let allViews: [UIView] = [cardView, photoView,
                                  privateBadge, titleLabel, timeLabel,
                                  newBadge, pinView, pinCircle]
        allViews.forEach { $0.translatesAutoresizingMaskIntoConstraints = false }

        NSLayoutConstraint.activate([
            // 卡片
            cardView.topAnchor.constraint(equalTo: topAnchor),
            cardView.leadingAnchor.constraint(equalTo: leadingAnchor),
            cardView.widthAnchor.constraint(equalToConstant: cardWidth),
            cardView.heightAnchor.constraint(equalToConstant: cardHeight),

            // 左侧缩略图
            photoView.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 8),
            photoView.centerYAnchor.constraint(equalTo: cardView.centerYAnchor),
            photoView.widthAnchor.constraint(equalToConstant: 48),
            photoView.heightAnchor.constraint(equalToConstant: 48),

            // 私密锁（图片左下角）
            privateBadge.leadingAnchor.constraint(equalTo: photoView.leadingAnchor, constant: 2),
            privateBadge.bottomAnchor.constraint(equalTo: photoView.bottomAnchor, constant: -2),

            // 标题（右上）
            titleLabel.leadingAnchor.constraint(equalTo: photoView.trailingAnchor, constant: 10),
            titleLabel.trailingAnchor.constraint(lessThanOrEqualTo: newBadge.leadingAnchor, constant: -4),
            titleLabel.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 14),

            // 时间（右下）
            timeLabel.leadingAnchor.constraint(equalTo: titleLabel.leadingAnchor),
            timeLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),

            // NEW 角标（右上角）
            newBadge.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 8),
            newBadge.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -8),
            newBadge.widthAnchor.constraint(equalToConstant: 32),
            newBadge.heightAnchor.constraint(equalToConstant: 14),

            // 橙色 pin
            pinView.topAnchor.constraint(equalTo: cardView.bottomAnchor, constant: 0),
            pinView.centerXAnchor.constraint(equalTo: cardView.centerXAnchor),
            pinView.widthAnchor.constraint(equalToConstant: 14),
            pinView.heightAnchor.constraint(equalToConstant: pinHeight),

            pinCircle.topAnchor.constraint(equalTo: pinView.topAnchor),
            pinCircle.centerXAnchor.constraint(equalTo: pinView.centerXAnchor),
            pinCircle.widthAnchor.constraint(equalToConstant: 14),
            pinCircle.heightAnchor.constraint(equalToConstant: 14),
        ])

        // pin 三角（圆下方的小尖）
        let triPath = UIBezierPath()
        triPath.move(to: CGPoint(x: 7, y: pinHeight))      // 尖端
        triPath.addLine(to: CGPoint(x: 2, y: 12))          // 左
        triPath.addLine(to: CGPoint(x: 12, y: 12))         // 右
        triPath.close()
        pinTriangle.path = triPath.cgPath

        // 整体 frame：卡片 + pin；让 pin 尖端对齐坐标点
        let totalHeight = cardHeight + pinHeight
        frame = CGRect(x: 0, y: 0, width: cardWidth, height: totalHeight)
        centerOffset = CGPoint(x: 0, y: -totalHeight / 2)
    }

    // MARK: - Configure
    /// - Parameters:
    ///   - isNew: 是否展示 NEW 角标（控制可见性 + 层级）
    ///   - shouldBounce: 是否启动跳动（与 isNew 解耦：本次冷启首次曝光才跳动）
    ///   - fallbackImageName: 用户未上传图片时使用的默认图资源名
    func configure(with memory: MemoryModel,
                   isNew: Bool = false,
                   shouldBounce: Bool = false,
                   isHost: Bool = true,
                   fallbackImageName: String? = nil) {
        titleLabel.text = memory.location
        timeLabel.text = "\(memory.year)年\(memory.month)月"

        // NEW 标签：可见 + 提升整张标注层级，防止被相邻卡片覆盖
        newBadge.isHidden = !isNew
        newBadge.alpha = 1
        newBadge.layer.zPosition = 100
        cardView.layer.zPosition = isNew ? 50 : 0
        layer.zPosition = isNew ? 1000 : 0
        isCurrentlyNew = isNew

        // 跳动动画：仅本次冷启首次曝光时启动；下次冷启或点击后不再跳
        if shouldBounce {
            startBounceAnimation()
        } else {
            stopBounceAnimation()
        }

        // 私密标签：按需求不再在卡片上展示
        privateBadge.isHidden = true

        // 私密回忆：保留淡灰边框，仅主态可见，便于和公开回忆区分
        if memory.isPrivate && isHost {
            cardView.layer.borderColor = UIColor(hex: "#d9d9d9").cgColor
            cardView.layer.borderWidth = 1
        } else {
            cardView.layer.borderColor = UIColor.clear.cgColor
            cardView.layer.borderWidth = 0
        }

        // 缩略图：优先用户上传的第一张 → 默认图（兜底）
        if let firstName = memory.imageNames.first, let img = UIImage(named: firstName) {
            photoView.image = img
            photoView.backgroundColor = .clear
        } else if let fb = fallbackImageName, let img = UIImage(named: fb) {
            photoView.image = img
            photoView.backgroundColor = .clear
        } else {
            photoView.image = nil
            photoView.backgroundColor = TGColors.headerFallback.withAlphaComponent(0.15)
        }
    }

    // MARK: - Bounce 动画
    private func startBounceAnimation() {
        layer.removeAnimation(forKey: "bounce")
        let anim = CABasicAnimation(keyPath: "transform.translation.y")
        anim.fromValue = 0
        anim.toValue = -8
        anim.duration = 0.6
        anim.autoreverses = true
        anim.repeatCount = .infinity
        anim.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        layer.add(anim, forKey: "bounce")
    }

    private func stopBounceAnimation() {
        layer.removeAnimation(forKey: "bounce")
    }

    /// 用户点击后：淡出 NEW 角标并停止跳动
    func dismissNewBadgeAnimated() {
        guard isCurrentlyNew else { return }
        isCurrentlyNew = false
        stopBounceAnimation()
        UIView.animate(withDuration: 0.25, animations: {
            self.newBadge.alpha = 0
        }, completion: { _ in
            self.newBadge.isHidden = true
        })
        // 还原层级
        layer.zPosition = 0
    }
}
