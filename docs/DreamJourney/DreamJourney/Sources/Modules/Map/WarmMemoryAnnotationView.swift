import UIKit

// MARK: - WarmMemoryAnnotationView
// Warm Vintage 风格的回忆标记点（用于高德地图 MAAnnotationView）
// 当前作为 UIView 实现，集成高德 SDK 时继承 MAAnnotationView 即可
final class WarmMemoryAnnotationView: UIView {

    enum DisplayState {
        case expanded   // 展开态：白色圆角卡片 + 橙色"最新生成"胶囊
        case collapsed  // 折叠态：方形照片缩略图 + 深棕文字框
    }

    var state: DisplayState = .collapsed {
        didSet { updateDisplay() }
    }

    // MARK: - Expanded UI
    private let cardView: UIView = {
        let v = UIView()
        v.backgroundColor = .warmSurface
        v.layer.cornerRadius = 12
        v.layer.shadowColor = UIColor.black.cgColor
        v.layer.shadowOpacity = 0.12
        v.layer.shadowOffset = CGSize(width: 0, height: 4)
        v.layer.shadowRadius = 8
        return v
    }()

    private let latestBadge: UIView = {
        let v = UIView()
        v.backgroundColor = .warmAccent
        v.layer.cornerRadius = 10
        return v
    }()

    private let latestLabel: UILabel = {
        let l = UILabel()
        l.text = "最新生成"
        l.font = .systemFont(ofSize: 11, weight: .semibold)
        l.textColor = .white
        l.textAlignment = .center
        return l
    }()

    private let thumbnailInCard: UIImageView = {
        let iv = UIImageView()
        iv.backgroundColor = .warmBackground
        iv.contentMode = .scaleAspectFill
        iv.clipsToBounds = true
        iv.layer.cornerRadius = 8
        return iv
    }()

    private let titleInCard: UILabel = {
        let l = UILabel()
        l.text = "一段回忆"
        l.font = .systemFont(ofSize: 13, weight: .medium)
        l.textColor = .warmPrimary
        l.numberOfLines = 2
        return l
    }()

    // MARK: - Collapsed UI
    private let thumbnailView: UIImageView = {
        let iv = UIImageView()
        iv.backgroundColor = .warmBackground
        iv.contentMode = .scaleAspectFill
        iv.clipsToBounds = true
        iv.layer.cornerRadius = 8
        return iv
    }()

    private let titleBox: UIView = {
        let v = UIView()
        v.backgroundColor = .warmDeep
        v.layer.cornerRadius = 6
        v.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        return v
    }()

    private let titleBoxLabel: UILabel = {
        let l = UILabel()
        l.text = "回忆"
        l.font = .systemFont(ofSize: 10, weight: .medium)
        l.textColor = .white
        l.textAlignment = .center
        return l
    }()

    // MARK: - Init
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }

    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Setup
    private func setupView() {
        // Expanded Card
        addSubview(cardView)
        latestBadge.addSubview(latestLabel)
        cardView.addSubview(latestBadge)
        cardView.addSubview(thumbnailInCard)
        cardView.addSubview(titleInCard)

        // Collapsed
        addSubview(thumbnailView)
        titleBox.addSubview(titleBoxLabel)
        addSubview(titleBox)

        [cardView, latestBadge, latestLabel,
         thumbnailInCard, titleInCard,
         thumbnailView, titleBox, titleBoxLabel].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
        }

        // Expanded: 160×100 卡片
        NSLayoutConstraint.activate([
            cardView.topAnchor.constraint(equalTo: topAnchor),
            cardView.leadingAnchor.constraint(equalTo: leadingAnchor),
            cardView.widthAnchor.constraint(equalToConstant: 160),
            cardView.heightAnchor.constraint(equalToConstant: 100),

            latestBadge.topAnchor.constraint(equalTo: cardView.topAnchor, constant: 8),
            latestBadge.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 8),
            latestBadge.heightAnchor.constraint(equalToConstant: 20),

            latestLabel.centerYAnchor.constraint(equalTo: latestBadge.centerYAnchor),
            latestLabel.leadingAnchor.constraint(equalTo: latestBadge.leadingAnchor, constant: 8),
            latestLabel.trailingAnchor.constraint(equalTo: latestBadge.trailingAnchor, constant: -8),

            thumbnailInCard.leadingAnchor.constraint(equalTo: cardView.leadingAnchor, constant: 8),
            thumbnailInCard.topAnchor.constraint(equalTo: latestBadge.bottomAnchor, constant: 6),
            thumbnailInCard.widthAnchor.constraint(equalToConstant: 52),
            thumbnailInCard.heightAnchor.constraint(equalToConstant: 52),

            titleInCard.leadingAnchor.constraint(equalTo: thumbnailInCard.trailingAnchor, constant: 8),
            titleInCard.topAnchor.constraint(equalTo: thumbnailInCard.topAnchor),
            titleInCard.trailingAnchor.constraint(equalTo: cardView.trailingAnchor, constant: -8),
        ])

        // Collapsed: 48×48 缩略图 + 文字框
        NSLayoutConstraint.activate([
            thumbnailView.topAnchor.constraint(equalTo: topAnchor),
            thumbnailView.leadingAnchor.constraint(equalTo: leadingAnchor),
            thumbnailView.widthAnchor.constraint(equalToConstant: 48),
            thumbnailView.heightAnchor.constraint(equalToConstant: 48),

            titleBox.topAnchor.constraint(equalTo: thumbnailView.bottomAnchor),
            titleBox.centerXAnchor.constraint(equalTo: thumbnailView.centerXAnchor),
            titleBox.widthAnchor.constraint(equalToConstant: 48),
            titleBox.heightAnchor.constraint(equalToConstant: 20),

            titleBoxLabel.centerXAnchor.constraint(equalTo: titleBox.centerXAnchor),
            titleBoxLabel.centerYAnchor.constraint(equalTo: titleBox.centerYAnchor),
        ])

        updateDisplay()
    }

    private func updateDisplay() {
        cardView.isHidden = (state == .collapsed)
        thumbnailView.isHidden = (state == .expanded)
        titleBox.isHidden = (state == .expanded)
    }

    // MARK: - Configure
    func configure(title: String, image: UIImage? = nil, isLatest: Bool = false, state: DisplayState = .collapsed) {
        titleInCard.text = title
        titleBoxLabel.text = title.count > 2 ? String(title.prefix(2)) : title
        thumbnailInCard.image = image
        thumbnailView.image = image
        latestBadge.isHidden = !isLatest
        self.state = state
    }
}
