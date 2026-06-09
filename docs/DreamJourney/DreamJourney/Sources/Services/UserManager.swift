import Foundation

// MARK: - UserManager 单例：管理登录态
final class UserManager {

    static let shared = UserManager()
    private init() { loadFromDefaults() }

    private let kUserKey = "dj_current_user"
    private let kLoggedInKey = "dj_is_logged_in"

    private(set) var currentUser: UserModel?
    var isLoggedIn: Bool { currentUser != nil }

    // MARK: - 登录
    func login(phone: String, nickname: String) {
        let user = UserModel(
            id: "user_\(phone.suffix(4))",
            nickname: nickname.isEmpty ? "寻梦环游用户" : nickname,
            phone: phone,
            avatarName: "person.circle.fill"
        )
        currentUser = user
        saveToDefaults()
        NotificationCenter.default.post(name: .djUserDidLogin, object: nil)
    }

    // MARK: - 退出登录
    func logout() {
        currentUser = nil
        UserDefaults.standard.removeObject(forKey: kUserKey)
        UserDefaults.standard.removeObject(forKey: kLoggedInKey)
        NotificationCenter.default.post(name: .djUserDidLogout, object: nil)
    }

    // MARK: - 持久化
    private func saveToDefaults() {
        guard let user = currentUser,
              let data = try? JSONEncoder().encode(user) else { return }
        UserDefaults.standard.set(data, forKey: kUserKey)
        UserDefaults.standard.set(true, forKey: kLoggedInKey)
    }

    private func loadFromDefaults() {
        guard let data = UserDefaults.standard.data(forKey: kUserKey),
              let user = try? JSONDecoder().decode(UserModel.self, from: data) else { return }
        currentUser = user
    }
}

// MARK: - Notification 名称
extension Notification.Name {
    static let djUserDidLogin  = Notification.Name("dj.user.didLogin")
    static let djUserDidLogout = Notification.Name("dj.user.didLogout")
    static let djNewMemoryCreated = Notification.Name("dj.memory.newCreated")
}
