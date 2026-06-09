import UIKit

// MARK: - AppCoordinator：根协调器，路由到 Auth 或 Tab
final class AppCoordinator: Coordinator {

    var navigationController: UINavigationController
    var childCoordinators: [Coordinator] = []
    private weak var window: UIWindow?

    init(window: UIWindow) {
        self.window = window
        self.navigationController = UINavigationController()
    }

    func start() {
        if UserManager.shared.isLoggedIn {
            showMainTab()
        } else {
            showAuth()
        }

        // 监听登出通知
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleLogout),
            name: .djUserDidLogout,
            object: nil
        )
    }

    func showAuth() {
        let authCoordinator = AuthCoordinator(navigationController: navigationController)
        authCoordinator.didFinishLogin = { [weak self] in
            self?.removeChild(authCoordinator)
            self?.showMainTab()
        }
        addChild(authCoordinator)
        window?.rootViewController = navigationController
        window?.makeKeyAndVisible()
        authCoordinator.start()
    }

    func showMainTab() {
        let tabCoordinator = TabCoordinator()
        tabCoordinator.didRequestLogout = { [weak self] in
            self?.removeChild(tabCoordinator)
            self?.navigationController = UINavigationController()
            self?.showAuth()
        }
        addChild(tabCoordinator)
        window?.rootViewController = tabCoordinator.tabBarController
        window?.makeKeyAndVisible()
        tabCoordinator.start()
    }

    @objc private func handleLogout() {
        // 清理子Coordinator
        childCoordinators.removeAll()
        navigationController = UINavigationController()
        showAuth()
    }
}
