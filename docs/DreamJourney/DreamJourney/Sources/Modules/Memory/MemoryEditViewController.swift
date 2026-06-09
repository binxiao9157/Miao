import UIKit

// MARK: - MemoryEditViewController：回忆编辑页（仅主态可用）
// 允许编辑：标题 / 地点 / 正文（fullContent） / 私密开关
// 保存后：
//   1) 更新 MemoryRepository（同时回写 fullContent / subtitle）
//   2) 若有关联的 MemoirModel（id 一致），同步更新 prose / title / location / isPrivate
//   3) 通知详情页通过闭包 onSaved 拉取最新数据刷新
final class MemoryEditViewController: UIViewController {

    // MARK: - Input
    private var memory: MemoryModel
    /// 保存成功后回调最新 memory，调用方据此刷新 UI
    var onSaved: ((MemoryModel) -> Void)?

    // MARK: - UI
    private lazy var scrollView: UIScrollView = {
        let sv = UIScrollView()
        sv.alwaysBounceVertical = true
        sv.keyboardDismissMode = .interactive
        return sv
    }()

    private lazy var contentStack: UIStackView = {
        let s = UIStackView()
        s.axis = .vertical
        s.spacing = 18
        return s
    }()

    private let titleField = MemoryEditViewController.makeTextField(placeholder: "标题，如：上海 · 1975 年 7 月")
    private let locationField = MemoryEditViewController.makeTextField(placeholder: "地点，如：上海外滩")

    private lazy var contentTextView: UITextView = {
        let tv = UITextView()
        tv.font = .systemFont(ofSize: 16)
        tv.textColor = TGColors.textPrimary
        tv.backgroundColor = .white
        tv.layer.cornerRadius = 10
        tv.textContainerInset = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        tv.layer.borderColor = UIColor.warmDivider.cgColor
        tv.layer.borderWidth = 0.5
        return tv
    }()

    private let privacySwitch: UISwitch = {
        let s = UISwitch()
        s.onTintColor = .warmAccent
        return s
    }()

    private let privacyLabel: UILabel = {
        let l = UILabel()
        l.text = "设为私密（仅自己可见）"
        l.font = .systemFont(ofSize: 15)
        l.textColor = TGColors.textPrimary
        return l
    }()

    // MARK: - Init
    init(memory: MemoryModel) {
        self.memory = memory
        super.init(nibName: nil, bundle: nil)
        hidesBottomBarWhenPushed = true
    }

    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .warmBackground
        title = "编辑回忆"
        setupNavigationBar()
        setupLayout()
        loadInitialData()
    }

    // MARK: - NavigationBar
    private func setupNavigationBar() {
        navigationItem.leftBarButtonItem = UIBarButtonItem(
            title: "取消", style: .plain, target: self, action: #selector(cancelTapped))
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            title: "保存", style: .done, target: self, action: #selector(saveTapped))
        navigationItem.rightBarButtonItem?.tintColor = .warmAccent
    }

    // MARK: - Layout
    private func setupLayout() {
        view.addSubview(scrollView)
        scrollView.addSubview(contentStack)
        [scrollView, contentStack].forEach { $0.translatesAutoresizingMaskIntoConstraints = false }

        // 各字段标签 + 输入区
        let titleSection = makeSection(title: "标题", control: titleField, controlHeight: 44)
        let locationSection = makeSection(title: "地点", control: locationField, controlHeight: 44)
        let contentSection = makeSection(title: "正文", control: contentTextView, controlHeight: 260)

        // 私密行（label + switch 横排）
        let privacyRow = UIStackView(arrangedSubviews: [privacyLabel, UIView(), privacySwitch])
        privacyRow.axis = .horizontal
        privacyRow.alignment = .center
        privacyRow.spacing = 8

        contentStack.addArrangedSubview(titleSection)
        contentStack.addArrangedSubview(locationSection)
        contentStack.addArrangedSubview(contentSection)
        contentStack.addArrangedSubview(privacyRow)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 16),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -24),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -32),
        ])
    }

    /// 标准化的「标签 + 输入区」组合
    private func makeSection(title: String, control: UIView, controlHeight: CGFloat) -> UIView {
        let label = UILabel()
        label.text = title
        label.font = .systemFont(ofSize: 13, weight: .medium)
        label.textColor = TGColors.textSecondary

        let stack = UIStackView(arrangedSubviews: [label, control])
        stack.axis = .vertical
        stack.spacing = 8
        control.translatesAutoresizingMaskIntoConstraints = false
        control.heightAnchor.constraint(equalToConstant: controlHeight).isActive = true
        return stack
    }

    // MARK: - Data
    private func loadInitialData() {
        titleField.text = memory.title
        locationField.text = memory.location
        // 正文优先级：fullContent → subtitle → title
        if let content = memory.fullContent, !content.isEmpty {
            contentTextView.text = content
        } else if !memory.subtitle.isEmpty {
            contentTextView.text = memory.subtitle
        } else {
            contentTextView.text = memory.title
        }
        privacySwitch.isOn = memory.isPrivate
    }

    // MARK: - Actions
    @objc private func cancelTapped() {
        navigationController?.popViewController(animated: true)
    }

    @objc private func saveTapped() {
        let newTitle = (titleField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let newLocation = (locationField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let newContent = contentTextView.text.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !newTitle.isEmpty else {
            showToast("标题不能为空", type: .info)
            return
        }
        guard !newContent.isEmpty else {
            showToast("正文不能为空", type: .info)
            return
        }

        // 1) 更新 MemoryModel
        var updated = memory
        updated.title = newTitle
        updated.location = newLocation.isEmpty ? memory.location : newLocation
        updated.fullContent = newContent
        // subtitle 跟随正文首句重新生成（保持地图气泡简洁）
        updated.subtitle = MemoryEditViewController.firstSentence(from: newContent)
        updated.isPrivate = privacySwitch.isOn
        MemoryRepository.shared.update(updated)

        // 2) 同步更新 MemoirModel（如有）
        if var memoir = MemoirRepository.shared.get(by: memory.id) {
            memoir.title = newTitle
            memoir.prose = newContent
            memoir.location = updated.location
            memoir.isPrivate = privacySwitch.isOn
            memoir.updatedAt = Date()
            MemoirRepository.shared.save(memoir)
        }

        memory = updated
        onSaved?(updated)
        showToast("已保存", type: .success)
        navigationController?.popViewController(animated: true)
    }

    // MARK: - Helpers
    private static func makeTextField(placeholder: String) -> UITextField {
        let f = UITextField()
        f.placeholder = placeholder
        f.font = .systemFont(ofSize: 16)
        f.textColor = TGColors.textPrimary
        f.backgroundColor = .white
        f.layer.cornerRadius = 10
        f.layer.borderColor = UIColor.warmDivider.cgColor
        f.layer.borderWidth = 0.5
        f.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 0))
        f.leftViewMode = .always
        f.rightView = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 0))
        f.rightViewMode = .always
        f.clearButtonMode = .whileEditing
        return f
    }

    /// 取正文首句（句号/感叹号/问号截断），最多 30 字
    private static func firstSentence(from text: String) -> String {
        let trimmed = text.replacingOccurrences(of: "\n", with: " ")
        if let endIdx = trimmed.firstIndex(where: { "。！？.!?".contains($0) }) {
            return String(trimmed[..<endIdx])
        }
        return String(trimmed.prefix(30))
    }
}
