import UIKit

// MARK: - UIViewController 通用扩展
extension UIViewController {

    // Toast 快捷方法
    func showToast(_ message: String, type: TGToast.ToastType = .info) {
        TGToast.show(type: type, message: message)
    }

    // 点击空白区域隐藏键盘
    func hideKeyboardWhenTapped() {
        let tap = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tap.cancelsTouchesInView = false
        view.addGestureRecognizer(tap)
    }

    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }

    // 设置导航栏透明
    func setNavigationBarTransparent(_ transparent: Bool) {
        if transparent {
            navigationController?.navigationBar.setBackgroundImage(UIImage(), for: .default)
            navigationController?.navigationBar.shadowImage = UIImage()
            navigationController?.navigationBar.isTranslucent = true
        } else {
            navigationController?.navigationBar.setBackgroundImage(nil, for: .default)
            navigationController?.navigationBar.shadowImage = nil
        }
    }
}

// MARK: - UIView 通用扩展
extension UIView {
    // 快速添加圆角
    func roundCorners(_ radius: CGFloat) {
        layer.cornerRadius = radius
        clipsToBounds = true
    }

    // 添加渐变层
    @discardableResult
    func addGradientLayer(colors: [UIColor], startPoint: CGPoint = CGPoint(x: 0, y: 0), endPoint: CGPoint = CGPoint(x: 1, y: 1)) -> CAGradientLayer {
        let gradient = CAGradientLayer()
        gradient.colors = colors.map { $0.cgColor }
        gradient.startPoint = startPoint
        gradient.endPoint = endPoint
        gradient.frame = bounds
        layer.insertSublayer(gradient, at: 0)
        return gradient
    }
}
