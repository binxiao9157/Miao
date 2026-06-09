import UIKit

// TPRD v5.0 规范色值 -> Warm Vintage 重设计
// 禁止在业务代码中硬编码色值，请使用 UIColor.warmXxx 或 TGColors.xxx
struct TGColors {
    // 品牌深棕主色（Warm Vintage）
    static let brandBlue = UIColor.warmPrimary
    // 品牌渐变起始色（已弃用，保留兼容）
    static let brandGradientStart = UIColor.warmDeep
    // 品牌渐变结束色（已弃用，保留兼容）
    static let brandGradientEnd = UIColor.warmPrimary
    // AI 气泡背景色：白色卡片
    static let aiBubbleBg = UIColor.warmSurface
    // 用户气泡背景色：深棕
    static let userBubbleBg = UIColor.warmDeep
    // 成功绿
    static let successGreen = UIColor(hex: "#52c41a")
    // 失败红
    static let errorRed = UIColor(hex: "#ff4d4f")
    // 主文字色 -> warmPrimary
    static let textPrimary = UIColor.warmPrimary
    // 辅助文字色 -> warmSubtitle
    static let textSecondary = UIColor.warmSubtitle
    // 浅灰背景 -> warmBackground
    static let bgGray = UIColor.warmBackground
    // 按钮禁用色
    static let buttonDisabled = UIColor(hex: "#cccccc")
    // 状态横幅背景 -> warmDeep（深棕横幅）
    static let bannerBg = UIColor.warmDeep
    // 骨架屏色
    static let skeleton = UIColor(hex: "#f0f0f0")
    // 头图降级色 -> warmDeep
    static let headerFallback = UIColor.warmDeep
    // 最新标记色 -> warmAccent（橙色）
    static let latestMarker = UIColor.warmAccent
}

// MARK: - UIColor Hex 扩展
extension UIColor {
    convenience init(hex: String) {
        var hexStr = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if hexStr.hasPrefix("#") {
            hexStr = String(hexStr.dropFirst())
        }
        var rgb: UInt64 = 0
        Scanner(string: hexStr).scanHexInt64(&rgb)
        let r = CGFloat((rgb >> 16) & 0xFF) / 255.0
        let g = CGFloat((rgb >> 8) & 0xFF) / 255.0
        let b = CGFloat(rgb & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b, alpha: 1.0)
    }
}
