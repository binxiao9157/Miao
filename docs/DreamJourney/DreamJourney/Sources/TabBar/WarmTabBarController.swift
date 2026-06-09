import UIKit

// MARK: - WarmTabBarController
// Warm Vintage 自定义 TabBar，隐藏系统 TabBar，使用自定义 WarmTabBarView
final class WarmTabBarController: UITabBarController {

    // MARK: - Properties
    private let warmTabBar = WarmTabBarView()

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        // 隐藏系统 TabBar
        tabBar.isHidden = true
        // ⚠️ 不在此处统一设置 additionalSafeAreaInsets.bottom：
        // 当 child 是 UINavigationController 嵌 VC 时，这里的设置传播到孙级 VC 时机不稳定，
        // 会导致首次进入 child VC 的 safeArea bottom 为 0，UI 被 TabBar 遮挡。
        // 改为每个 child VC（AIRecording / Map.host / FamilyCircle）自行设置 56pt 底部 inset。
        setupWarmTabBar()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // 动态更新 WarmTabBar 的高度（适配 Safe Area）
        let safeBottom = view.safeAreaInsets.bottom
        let barHeight: CGFloat = 56 + safeBottom
        warmTabBar.frame = CGRect(
            x: 0,
            y: view.bounds.height - barHeight,
            width: view.bounds.width,
            height: barHeight
        )
        warmTabBar.safeBottom = safeBottom
        // ⚠️ 关键：UITabBarController 切换 child VC 时会把 child view 加到顶层，
        // 必须每次布局后把自定义 TabBar 提到最前，否则按钮会被 child 遮挡导致点击无效。
        view.bringSubviewToFront(warmTabBar)
    }

    // MARK: - UITabBarControllerDelegate
    // 切换 tab 后立即把自定义 TabBar 提到最前（双保险）
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        view.bringSubviewToFront(warmTabBar)
    }

    // MARK: - Setup
    private func setupWarmTabBar() {
        view.addSubview(warmTabBar)
        warmTabBar.onTabSelected = { [weak self] index in
            guard let self = self else { return }
            self.selectedIndex = index
            self.warmTabBar.updateSelection(index)
            // 切换后强制把 TabBar 提到最前（child VC view 会被 UIKit 重新加到顶层）
            self.view.bringSubviewToFront(self.warmTabBar)
        }
    }

    // MARK: - Override selectedIndex
    override var selectedIndex: Int {
        didSet {
            warmTabBar.updateSelection(selectedIndex)
        }
    }
}

// MARK: - WarmTabBarView
// 自定义 TabBar 视图：三个 Tab 按钮 + 深棕/米白配色
final class WarmTabBarView: UIView {

    /// WarmTabBar 内容区域固定高度（不含 home indicator）
    static let tabBarHeight: CGFloat = 56

    struct TabItem {
        let iconName: String        // SF Symbol 名称（未选态）
        let iconNameFill: String    // SF Symbol 名称（选中态，filled）
        let title: String
    }

    private let items: [TabItem] = [
        TabItem(iconName: "mic", iconNameFill: "mic.fill", title: "回忆"),
        TabItem(iconName: "book",              iconNameFill: "book.fill",              title: "足迹"),
        TabItem(iconName: "person.2",         iconNameFill: "person.2.fill",         title: "亲友"),
    ]

    private var buttons: [UIButton] = []
    private var selectedCircles: [UIView] = []
    var onTabSelected: ((Int) -> Void)?

    /// 动态 safe area 底部高度，供 layoutSubviews 使用
    var safeBottom: CGFloat = 0 {
        didSet { setNeedsLayout() }
    }

    // MARK: - Init
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }

    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Setup
    private func setupView() {
        backgroundColor = .warmBackground

        // 顶部 0.5px 分割线
        let divider = UIView()
        divider.backgroundColor = .warmDivider
        divider.translatesAutoresizingMaskIntoConstraints = false
        addSubview(divider)
        NSLayoutConstraint.activate([
            divider.topAnchor.constraint(equalTo: topAnchor),
            divider.leadingAnchor.constraint(equalTo: leadingAnchor),
            divider.trailingAnchor.constraint(equalTo: trailingAnchor),
            divider.heightAnchor.constraint(equalToConstant: 0.5),
        ])

        // 创建三个 Tab 按钮
        for (index, item) in items.enumerated() {
            let circle = makeCircleView()
            selectedCircles.append(circle)

            let btn = makeTabButton(item: item, tag: index)
            buttons.append(btn)

            addSubview(circle)
            addSubview(btn)
        }

        updateSelection(0)
    }

    private func makeCircleView() -> UIView {
        let v = UIView()
        v.backgroundColor = .warmPrimary
        v.layer.cornerRadius = 18
        v.isUserInteractionEnabled = false
        v.alpha = 0
        return v
    }

    private func makeTabButton(item: TabItem, tag: Int) -> UIButton {
        let btn = UIButton(type: .custom)
        btn.tag = tag
        btn.addTarget(self, action: #selector(tabTapped(_:)), for: .touchUpInside)
        return btn
    }

    // MARK: - Layout
    override func layoutSubviews() {
        super.layoutSubviews()
        let tabWidth = bounds.width / CGFloat(items.count)
        let tabAreaHeight: CGFloat = 56

        for (index, btn) in buttons.enumerated() {
            let x = tabWidth * CGFloat(index)
            btn.frame = CGRect(x: x, y: 0, width: tabWidth, height: tabAreaHeight)

            // 选中圆背景（36×36）
            let circle = selectedCircles[index]
            let circleSize: CGFloat = 36
            circle.frame = CGRect(
                x: x + (tabWidth - circleSize) / 2,
                y: (tabAreaHeight - circleSize) / 2,
                width: circleSize,
                height: circleSize
            )
            circle.layer.cornerRadius = circleSize / 2
        }
    }

    // MARK: - Update Selection
    func updateSelection(_ index: Int) {
        for (i, btn) in buttons.enumerated() {
            let isSelected = (i == index)
            let item = items[i]
            let circle = selectedCircles[i]

            UIView.animate(withDuration: 0.2) {
                circle.alpha = 0  // 始终隐藏圆圈背景
            }

            // 重新构建按钮内容
            configureButton(btn, item: item, isSelected: isSelected)
        }
    }

    private func configureButton(_ btn: UIButton, item: TabItem, isSelected: Bool) {
        btn.subviews.forEach { if $0 is UILabel || $0 is UIImageView { $0.removeFromSuperview() } }

        let iconName = isSelected ? item.iconNameFill : item.iconName
        let iconColor: UIColor = isSelected ? .warmAccent : .warmSubtitle
        let titleColor: UIColor = isSelected ? .warmAccent : .warmSubtitle
        let titleFont: UIFont = isSelected
            ? .systemFont(ofSize: 12, weight: .semibold)
            : .systemFont(ofSize: 12, weight: .regular)

        let config = UIImage.SymbolConfiguration(pointSize: 18, weight: isSelected ? .semibold : .regular)
        let iconImage = UIImage(systemName: iconName, withConfiguration: config)

        let iconView = UIImageView(image: iconImage)
        iconView.tintColor = iconColor
        iconView.contentMode = .scaleAspectFit

        let titleLabel = UILabel()
        titleLabel.text = item.title
        titleLabel.font = titleFont
        titleLabel.textColor = titleColor
        titleLabel.textAlignment = .center

        btn.addSubview(iconView)
        btn.addSubview(titleLabel)
        iconView.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            iconView.centerXAnchor.constraint(equalTo: btn.centerXAnchor),
            iconView.centerYAnchor.constraint(equalTo: btn.centerYAnchor, constant: -8),
            iconView.widthAnchor.constraint(equalToConstant: 22),
            iconView.heightAnchor.constraint(equalToConstant: 22),

            titleLabel.centerXAnchor.constraint(equalTo: btn.centerXAnchor),
            titleLabel.topAnchor.constraint(equalTo: iconView.bottomAnchor, constant: 2),
        ])
    }

    // MARK: - Actions
    @objc private func tabTapped(_ sender: UIButton) {
        onTabSelected?(sender.tag)
    }
}
