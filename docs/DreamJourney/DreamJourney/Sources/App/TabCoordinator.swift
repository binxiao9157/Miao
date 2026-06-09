import UIKit

// MARK: - TabCoordinator：3-Tab 主界面
final class TabCoordinator: Coordinator {

    var navigationController: UINavigationController
    var childCoordinators: [Coordinator] = []
    var didRequestLogout: (() -> Void)?

    let tabBarController = WarmTabBarController()

    init() {
        self.navigationController = UINavigationController()
    }

    func start() {
        setupTabs()
        configureAppearance()
    }

    private func setupTabs() {
        // Tab1: 对话记录
        let homeNav = UINavigationController()
        let homeVC = AIRecordingViewController()
        homeVC.title = "对话记录"
        homeNav.viewControllers = [homeVC]
        homeNav.navigationBar.tintColor = .warmPrimary

        // Tab2: 寻梦环游足迹（主态）
        let mapNav = UINavigationController()
        let currentUserId = UserManager.shared.currentUser?.id ?? "user_001"
        let mapVC = MapFootprintViewController(viewMode: .host, ownerId: currentUserId)
        mapVC.title = "寻梦环游足迹"
        mapNav.viewControllers = [mapVC]
        mapNav.navigationBar.tintColor = .warmPrimary

        // Tab3: 亲属圈
        let familyNav = UINavigationController()
        let familyVC = FamilyCircleViewController()
        familyVC.title = "亲属圈"
        familyNav.viewControllers = [familyVC]
        familyNav.navigationBar.tintColor = .warmPrimary

        // 注入退出登录回调
        familyVC.didRequestLogout = { [weak self] in
            self?.didRequestLogout?()
        }

        tabBarController.viewControllers = [homeNav, mapNav, familyNav]
    }

    private func configureAppearance() {
        // Warm Vintage: 使用自定义 WarmTabBarController，系统 appearance 已无需配置
        // NavigationBar 全局样式：深棕色标题
        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithOpaqueBackground()
        navAppearance.backgroundColor = .warmBackground
        navAppearance.titleTextAttributes = [
            .foregroundColor: UIColor.warmPrimary,
            .font: UIFont.systemFont(ofSize: 17, weight: .semibold)
        ]
        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
        UINavigationBar.appearance().tintColor = .warmPrimary
    }
}
