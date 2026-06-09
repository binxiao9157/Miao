import UIKit

// MARK: - LoginViewController：手机号登录页（Warm Vintage 改版）
/// 视觉布局（自上而下）：
///   1. 顶部空白 80
///   2. 橙色圆形 Logo（88×88）+ 内嵌人物图标
///   3. 副标语「让梦想在这里交织成网」斜体灰
///   4. 手机号输入框（带电话 icon）
///   5. 昵称输入框（带人物 icon）
///   6. 提示行：✨橙 + 多行灰色说明
///   7. 底部「开始记录回忆」主按钮（贴 safeArea bottom）
final class LoginViewController: UIViewController {

    var didLogin: (() -> Void)?

    // MARK: - Logo
    private let logoCircle: UIView = {
        let v = UIView()
        v.backgroundColor = .warmAccent
        v.layer.cornerRadius = 44
        v.layer.shadowColor = UIColor.black.cgColor
        v.layer.shadowOpacity = 0.10
        v.layer.shadowOffset = CGSize(width: 0, height: 4)
        v.layer.shadowRadius = 8
        return v
    }()

    private let logoIcon: UIImageView = {
        let cfg = UIImage.SymbolConfiguration(pointSize: 36, weight: .semibold)
        let iv = UIImageView(image: UIImage(systemName: "person.3.fill", withConfiguration: cfg))
        iv.tintColor = .white
        iv.contentMode = .scaleAspectFit
        return iv
    }()

    private let sloganLabel: UILabel = {
        let l = UILabel()
        l.text = "让梦想在这里交织成网"
        l.font = UIFont.italicSystemFont(ofSize: 14)
        l.textColor = TGColors.textSecondary
        l.textAlignment = .center
        return l
    }()

    // MARK: - 手机号输入框
    private let phoneFieldContainer = UIView()
    private let phoneIcon: UIImageView = {
        let cfg = UIImage.SymbolConfiguration(pointSize: 18, weight: .regular)
        let iv = UIImageView(image: UIImage(systemName: "phone", withConfiguration: cfg))
        iv.tintColor = TGColors.textSecondary
        iv.contentMode = .scaleAspectFit
        return iv
    }()
    private let phoneField: UITextField = {
        let f = UITextField()
        f.placeholder = "请输入您的手机号码"
        f.font = .systemFont(ofSize: 16)
        f.textColor = TGColors.textPrimary
        f.keyboardType = .numberPad
        f.returnKeyType = .next
        f.borderStyle = .none
        return f
    }()

    // MARK: - 昵称输入框
    private let nicknameFieldContainer = UIView()
    private let nicknameIcon: UIImageView = {
        let cfg = UIImage.SymbolConfiguration(pointSize: 18, weight: .regular)
        let iv = UIImageView(image: UIImage(systemName: "person", withConfiguration: cfg))
        iv.tintColor = TGColors.textSecondary
        iv.contentMode = .scaleAspectFit
        return iv
    }()
    private let nicknameField: UITextField = {
        let f = UITextField()
        f.placeholder = "想要大家怎么称呼您？"
        f.font = .systemFont(ofSize: 16)
        f.textColor = TGColors.textPrimary
        f.returnKeyType = .done
        f.borderStyle = .none
        f.clearButtonMode = .whileEditing
        return f
    }()

    // MARK: - 提示行
    private let hintIcon: UIImageView = {
        let cfg = UIImage.SymbolConfiguration(pointSize: 14, weight: .semibold)
        let iv = UIImageView(image: UIImage(systemName: "sparkles", withConfiguration: cfg))
        iv.tintColor = .warmAccent
        iv.contentMode = .scaleAspectFit
        return iv
    }()
    private let hintLabel: UILabel = {
        let l = UILabel()
        l.text = "使用真实姓名能让您的亲友在“家族圈”中更快速地找到您，共同珍藏回忆～"
        l.font = .systemFont(ofSize: 13)
        l.textColor = TGColors.textSecondary
        l.numberOfLines = 0
        return l
    }()

    // MARK: - 主按钮
    private lazy var loginButton: TGButton = {
        let b = TGButton(style: .primary)
        b.setTitle("开始记录回忆", for: .normal)
        b.isEnabled = false
        b.addTarget(self, action: #selector(loginTapped), for: .touchUpInside)
        return b
    }()

    private var rawPhone = ""

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .warmBackground
        navigationController?.setNavigationBarHidden(true, animated: false)
        setupLayout()
        setupActions()
        hideKeyboardWhenTapped()
    }

    // MARK: - Layout
    private func setupLayout() {
        configureFieldContainer(phoneFieldContainer, icon: phoneIcon, textField: phoneField)
        configureFieldContainer(nicknameFieldContainer, icon: nicknameIcon, textField: nicknameField)

        [logoCircle, sloganLabel,
         phoneFieldContainer, nicknameFieldContainer,
         hintIcon, hintLabel,
         loginButton].forEach {
            view.addSubview($0)
            $0.translatesAutoresizingMaskIntoConstraints = false
        }
        logoCircle.addSubview(logoIcon)
        logoIcon.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            // Logo 圆
            logoCircle.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 80),
            logoCircle.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            logoCircle.widthAnchor.constraint(equalToConstant: 88),
            logoCircle.heightAnchor.constraint(equalToConstant: 88),

            logoIcon.centerXAnchor.constraint(equalTo: logoCircle.centerXAnchor),
            logoIcon.centerYAnchor.constraint(equalTo: logoCircle.centerYAnchor),
            logoIcon.widthAnchor.constraint(equalToConstant: 48),
            logoIcon.heightAnchor.constraint(equalToConstant: 48),

            // 副标语
            sloganLabel.topAnchor.constraint(equalTo: logoCircle.bottomAnchor, constant: 16),
            sloganLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),

            // 手机号
            phoneFieldContainer.topAnchor.constraint(equalTo: sloganLabel.bottomAnchor, constant: 60),
            phoneFieldContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            phoneFieldContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            phoneFieldContainer.heightAnchor.constraint(equalToConstant: 56),

            // 昵称
            nicknameFieldContainer.topAnchor.constraint(equalTo: phoneFieldContainer.bottomAnchor, constant: 14),
            nicknameFieldContainer.leadingAnchor.constraint(equalTo: phoneFieldContainer.leadingAnchor),
            nicknameFieldContainer.trailingAnchor.constraint(equalTo: phoneFieldContainer.trailingAnchor),
            nicknameFieldContainer.heightAnchor.constraint(equalToConstant: 56),

            // 提示行
            hintIcon.topAnchor.constraint(equalTo: nicknameFieldContainer.bottomAnchor, constant: 20),
            hintIcon.leadingAnchor.constraint(equalTo: phoneFieldContainer.leadingAnchor, constant: 4),
            hintIcon.widthAnchor.constraint(equalToConstant: 18),
            hintIcon.heightAnchor.constraint(equalToConstant: 18),

            hintLabel.topAnchor.constraint(equalTo: hintIcon.topAnchor, constant: -2),
            hintLabel.leadingAnchor.constraint(equalTo: hintIcon.trailingAnchor, constant: 8),
            hintLabel.trailingAnchor.constraint(equalTo: phoneFieldContainer.trailingAnchor, constant: -4),

            // 主按钮（贴 safeArea bottom）
            loginButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            loginButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24),
            loginButton.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
            loginButton.heightAnchor.constraint(equalToConstant: 60),
        ])
    }

    /// 输入框容器统一样式：暖灰背景 + 圆角 14 + 左侧 icon + 右侧 textField
    private func configureFieldContainer(_ container: UIView, icon: UIImageView, textField: UITextField) {
        container.backgroundColor = UIColor(white: 0.95, alpha: 1.0)
        container.layer.cornerRadius = 14
        container.layer.borderWidth = 1
        container.layer.borderColor = UIColor.warmDivider.cgColor

        container.addSubview(icon)
        container.addSubview(textField)
        icon.translatesAutoresizingMaskIntoConstraints = false
        textField.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            icon.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 16),
            icon.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            icon.widthAnchor.constraint(equalToConstant: 22),
            icon.heightAnchor.constraint(equalToConstant: 22),

            textField.leadingAnchor.constraint(equalTo: icon.trailingAnchor, constant: 12),
            textField.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -16),
            textField.topAnchor.constraint(equalTo: container.topAnchor),
            textField.bottomAnchor.constraint(equalTo: container.bottomAnchor),
        ])
    }

    private func setupActions() {
        phoneField.delegate = self
        nicknameField.delegate = self
        phoneField.addTarget(self, action: #selector(phoneChanged), for: .editingChanged)
        nicknameField.addTarget(self, action: #selector(nicknameChanged), for: .editingChanged)
    }

    // MARK: - Actions
    @objc private func phoneChanged() {
        guard let text = phoneField.text else { return }
        // 过滤非数字 + 截断 11 位
        let digits = text.filter { $0.isNumber }
        rawPhone = String(digits.prefix(11))

        // 显示格式 3-4-4
        var formatted = ""
        for (i, ch) in rawPhone.enumerated() {
            if i == 3 || i == 7 { formatted += " " }
            formatted.append(ch)
        }
        phoneField.text = formatted

        loginButton.isEnabled = rawPhone.count == 11
    }

    @objc private func nicknameChanged() {
        guard let text = nicknameField.text else { return }
        if text.count > 20 {
            nicknameField.text = String(text.prefix(20))
        }
    }

    @objc private func loginTapped() {
        guard rawPhone.count == 11 else { return }
        let nickname = nicknameField.text?.trimmingCharacters(in: .whitespaces) ?? ""
        UserManager.shared.login(phone: rawPhone, nickname: nickname)
        didLogin?()
    }
}

// MARK: - UITextFieldDelegate
extension LoginViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField == phoneField {
            nicknameField.becomeFirstResponder()
        } else {
            textField.resignFirstResponder()
        }
        return true
    }
}
