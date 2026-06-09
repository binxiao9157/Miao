import UIKit

// TPRD v5.0 - 统一按钮组件
class TGButton: UIButton {

    enum ButtonStyle {
        case primary    // 背景#1677ff，白色文字20px加粗，高56px，圆角12px
        case secondary  // 背景#f5f5f5，深灰文字17px，高48px，圆角8px
        case text       // 透明背景，蓝色文字15px
    }

    private let style: ButtonStyle

    override var isEnabled: Bool {
        didSet { updateAppearance() }
    }

    init(style: ButtonStyle) {
        self.style = style
        super.init(frame: .zero)
        setupStyle()
    }

    required init?(coder: NSCoder) {
        self.style = .primary
        super.init(coder: coder)
        setupStyle()
    }

    private func setupStyle() {
        switch style {
        case .primary:
            layer.cornerRadius = 12
            titleLabel?.font = .boldSystemFont(ofSize: 20)
            setTitleColor(.white, for: .normal)
            setTitleColor(.white, for: .disabled)
            updateAppearance()
        case .secondary:
            layer.cornerRadius = 8
            titleLabel?.font = .systemFont(ofSize: 17)
            setTitleColor(TGColors.textPrimary, for: .normal)
            backgroundColor = TGColors.bgGray
        case .text:
            backgroundColor = .clear
            titleLabel?.font = .systemFont(ofSize: 15)
            setTitleColor(TGColors.brandBlue, for: .normal)
        }
        clipsToBounds = true
    }

    private func updateAppearance() {
        guard style == .primary else { return }
        backgroundColor = isEnabled ? TGColors.brandBlue : TGColors.buttonDisabled
    }

    override var intrinsicContentSize: CGSize {
        switch style {
        case .primary:
            return CGSize(width: super.intrinsicContentSize.width + 32, height: 56)
        case .secondary:
            return CGSize(width: super.intrinsicContentSize.width + 24, height: 48)
        case .text:
            return super.intrinsicContentSize
        }
    }
}
