import UIKit

// MARK: - AuthCoordinator：管理登录流程
final class AuthCoordinator: Coordinator {

    var navigationController: UINavigationController
    var childCoordinators: [Coordinator] = []
    var didFinishLogin: (() -> Void)?

    init(navigationController: UINavigationController) {
        self.navigationController = navigationController
    }

    func start() {
        let loginVC = LoginViewController()
        loginVC.didLogin = { [weak self] in
            self?.didFinishLogin?()
        }
        navigationController.setViewControllers([loginVC], animated: false)
    }
}
