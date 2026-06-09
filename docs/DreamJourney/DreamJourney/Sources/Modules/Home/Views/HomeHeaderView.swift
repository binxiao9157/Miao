import UIKit

// MARK: - HomeHeaderView
// 首页顶部油画风大图区，高度 = 屏幕高度 × 35%
// 包含：背景大图（底部两角圆角）+ 用户标题叠加层 + 右上角"切换账号"胶囊
final class HomeHeaderView: UIView {

    // MARK: - UI

    /// 顶部油画大图（home_header_warm），底部两角圆角 16px
    private let headerImageView: UIImageView = {
        let iv = UIImageView()
        iv.contentMode = .scaleAspectFill
        iv.clipsToBounds = true
        iv.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        iv.layer.cornerRadius = 16
        // 降级背景色：warmDeep 深棕，确保文字可见
        iv.backgroundColor = .warmDeep
        if let img = UIImage(named: "home_header_warm") {
            iv.image = img
        }
        return iv
    }()

    /// 半透明渐变遮罩（保证文字可读性）
    private let gradientLayer: CAGradientLayer = {
        let l = CAGradientLayer()
        l.colors = [
            UIColor.clear.cgColor,
            UIColor.black.withAlphaComponent(0.45).cgColor
        ]
        l.locations = [0.4, 1.0]
        return l
    }()

    /// 用户名标题，如"奶奶的时光"
    private let userTitleLabel: UILabel = {
        let l = UILabel()
        l.text = "我的旅途"
        l.font = .systemFont(ofSize: 22, weight: .bold)
        l.textColor = .white
        l.textAlignment = .left
        l.shadowColor = UIColor.black.withAlphaComponent(0.3)
        l.shadowOffset = CGSize(width: 0, height: 1)
        return l
    }()

    /// 副标题
    private let subtitleLabel: UILabel = {
        let l = UILabel()
        l.text = "每一段回忆都值得被珍藏"
        l.font = .systemFont(ofSize: 14, weight: .regular)
        l.textColor = UIColor.white.withAlphaComponent(0.9)
        l.textAlignment = .left
        return l
    }()

    /// 右上角"切换账号"半透明胶囊按钮
    let switchAccountButton: UIButton = {
        let b = UIButton(type: .system)
        b.setTitle("切换账号", for: .normal)
        b.setTitleColor(.white, for: .normal)
        b.titleLabel?.font = .systemFont(ofSize: 12, weight: .medium)
        b.backgroundColor = UIColor.black.withAlphaComponent(0.25)
        b.layer.cornerRadius = 12
        b.layer.masksToBounds = true
        b.contentEdgeInsets = UIEdgeInsets(top: 4, left: 10, bottom: 4, right: 10)
        return b
    }()

    // MARK: - Init
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }

    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Setup
    private func setupView() {
        addSubview(headerImageView)
        headerImageView.layer.addSublayer(gradientLayer)
        addSubview(userTitleLabel)
        addSubview(subtitleLabel)
        addSubview(switchAccountButton)

        [headerImageView, userTitleLabel, subtitleLabel, switchAccountButton].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
        }

        NSLayoutConstraint.activate([
            // 大图填满整个 HeaderView
            headerImageView.topAnchor.constraint(equalTo: topAnchor),
            headerImageView.leadingAnchor.constraint(equalTo: leadingAnchor),
            headerImageView.trailingAnchor.constraint(equalTo: trailingAnchor),
            headerImageView.bottomAnchor.constraint(equalTo: bottomAnchor),

            // 右上角"切换账号"按钮
            switchAccountButton.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 12),
            switchAccountButton.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            switchAccountButton.heightAnchor.constraint(equalToConstant: 24),

            // 用户名：底部偏上 40px
            userTitleLabel.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -36),
            userTitleLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 20),
            userTitleLabel.trailingAnchor.constraint(equalTo: switchAccountButton.leadingAnchor, constant: -8),

            // 副标题：用户名下方
            subtitleLabel.topAnchor.constraint(equalTo: userTitleLabel.bottomAnchor, constant: 4),
            subtitleLabel.leadingAnchor.constraint(equalTo: userTitleLabel.leadingAnchor),
            subtitleLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -20),
        ])
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        gradientLayer.frame = headerImageView.bounds
    }

    // MARK: - Configure
    /// 更新显示的用户名称
    func configure(userName: String) {
        userTitleLabel.text = "\(userName)的时光"
    }
}
