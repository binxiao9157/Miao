import Foundation

// MARK: - FamilyRepository 单例：亲属关系存储
final class FamilyRepository {

    static let shared = FamilyRepository()
    private init() { seedMockData() }

    private var members: [FamilyMember] = []

    func getAll() -> [FamilyMember] { return members }

    func add(_ member: FamilyMember) {
        members.append(member)
    }

    func remove(id: String) {
        members.removeAll { $0.id == id }
    }

    func get(by id: String) -> FamilyMember? {
        return members.first { $0.id == id }
    }

    // MARK: - Mock 数据
    private func seedMockData() {
        members = [
            FamilyMember(id: "fm_001", name: "林静文", relation: "祖母",  phone: nil, isOnline: false, lastUpdated: "2小时前"),
            FamilyMember(id: "fm_002", name: "张国强", relation: "父亲",  phone: nil, isOnline: false, lastUpdated: "昨天"),
            FamilyMember(id: "fm_003", name: "周美芳", relation: "母亲",  phone: nil, isOnline: true,  lastUpdated: "刚刚")
        ]
    }
}
