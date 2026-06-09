import UIKit

// MARK: - Warm Vintage 主题色扩展
// 通过 Named Color Asset 读取，支持未来深色模式扩展
extension UIColor {

    /// 页面主背景色 #FAF7F2（米白/奶油色）
    static var warmBackground: UIColor {
        UIColor(named: "WarmBackground") ?? UIColor(hex: "#FAF7F2")
    }

    /// 卡片/气泡背景色 #FFFFFF
    static var warmSurface: UIColor {
        UIColor(named: "WarmSurface") ?? .white
    }

    /// 主色/标题/深棕选中色 #3D2B1F
    static var warmPrimary: UIColor {
        UIColor(named: "WarmPrimary") ?? UIColor(hex: "#3D2B1F")
    }

    /// 深棕横幅/语音球 fallback #4A2B18
    static var warmDeep: UIColor {
        UIColor(named: "WarmDeep") ?? UIColor(hex: "#4A2B18")
    }

    /// 橙色强调/"最新生成" #F5841F
    static var warmAccent: UIColor {
        UIColor(named: "WarmAccent") ?? UIColor(hex: "#F5841F")
    }

    /// 副标题/次要文字 #8B7355
    static var warmSubtitle: UIColor {
        UIColor(named: "WarmSubtitle") ?? UIColor(hex: "#8B7355")
    }

    /// 分割线 #E8E0D5
    static var warmDivider: UIColor {
        UIColor(named: "WarmDivider") ?? UIColor(hex: "#E8E0D5")
    }

    /// 暖黄图标色（通知横幅图标）#F5C842
    static var warmIconYellow: UIColor {
        UIColor(hex: "#F5C842")
    }
}
