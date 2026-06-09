import Foundation

// MARK: - MemoryRepository 单例：内存回忆数据存储（含持久化）
final class MemoryRepository {

    static let shared = MemoryRepository()
    private init() {
        seedMockData()
        loadPersistedMemories()
    }

    private var memories: [MemoryModel] = []

    // MARK: - 持久化
    /// UserDefaults Key（仅持久化非 mock 的用户新增回忆，mock 每次启动重新 seed）
    private static let persistKey = "dj.persistedMemories"
    /// mock 数据 ID 前缀，用于区分是否需要持久化
    private static let mockIdPrefix = "mem_"

    private func loadPersistedMemories() {
        guard let data = UserDefaults.standard.data(forKey: Self.persistKey) else {
            print("[MemoirSync] MemoryRepository.loadPersisted: no data, mockOnly=\(memories.count)")
            return
        }
        do {
            let arr = try JSONDecoder().decode([MemoryModel].self, from: data)
            // 去重：避免与 mock 或已存在的同 ID 重复
            let existing = Set(memories.map { $0.id })
            let newOnes = arr.filter { !existing.contains($0.id) }
            memories.insert(contentsOf: newOnes, at: 0)
            print("[MemoirSync] MemoryRepository.loadPersisted: loaded=\(newOnes.count), totalNow=\(memories.count)")
        } catch {
            print("[MemoirSync] MemoryRepository.loadPersisted: decode error=\(error)")
        }
    }

    /// 写盘（仅持久化非 mock 的回忆）
    private func savePersistedMemories() {
        let nonMock = memories.filter { !$0.id.hasPrefix(Self.mockIdPrefix) }
        do {
            let data = try JSONEncoder().encode(nonMock)
            UserDefaults.standard.set(data, forKey: Self.persistKey)
            print("[MemoirSync] MemoryRepository.savePersisted: count=\(nonMock.count)")
        } catch {
            print("[MemoirSync] MemoryRepository.savePersisted: encode error=\(error)")
        }
    }

    // MARK: - CRUD
    func getAll() -> [MemoryModel] {
        return memories.sorted { $0.createdAt > $1.createdAt }
    }

    func getAllByOwner(_ ownerId: String) -> [MemoryModel] {
        return memories.filter { $0.authorId == ownerId }.sorted { $0.createdAt > $1.createdAt }
    }

    func getPublicByOwner(_ ownerId: String) -> [MemoryModel] {
        return memories.filter { $0.authorId == ownerId && !$0.isPrivate }.sorted { $0.createdAt > $1.createdAt }
    }

    func get(by id: String) -> MemoryModel? {
        return memories.first { $0.id == id }
    }

    func add(_ memory: MemoryModel) {
        memories.insert(memory, at: 0)
        savePersistedMemories()
        print("[MemoirSync] MemoryRepository.add: id=\(memory.id), title=\(memory.title), authorId=\(memory.authorId), total=\(memories.count) → post .djNewMemoryCreated")
        NotificationCenter.default.post(name: .djNewMemoryCreated, object: memory)
    }

    func update(_ memory: MemoryModel) {
        if let index = memories.firstIndex(where: { $0.id == memory.id }) {
            memories[index] = memory
            savePersistedMemories()
        }
    }

    func delete(id: String) {
        memories.removeAll { $0.id == id }
        savePersistedMemories()
    }

    func addComment(_ comment: CommentModel, to memoryId: String) {
        if let index = memories.firstIndex(where: { $0.id == memoryId }) {
            memories[index].comments.append(comment)
            savePersistedMemories()
        }
    }

    func toggleLike(userId: String, userName: String, on memoryId: String) -> Bool {
        guard let index = memories.firstIndex(where: { $0.id == memoryId }) else { return false }
        if let likeIndex = memories[index].likes.firstIndex(where: { $0.userId == userId }) {
            memories[index].likes.remove(at: likeIndex)
            savePersistedMemories()
            return false  // 取消点赞
        } else {
            memories[index].likes.append(LikeModel(userId: userId, userName: userName))
            savePersistedMemories()
            return true   // 点赞成功
        }
    }

    func addSupplement(_ supplement: SupplementModel, to memoryId: String) {
        if let index = memories.firstIndex(where: { $0.id == memoryId }) {
            memories[index].supplements.append(supplement)
            savePersistedMemories()
        }
    }

    func togglePrivacy(memoryId: String) {
        if let index = memories.firstIndex(where: { $0.id == memoryId }) {
            memories[index].isPrivate.toggle()
            savePersistedMemories()
        }
    }

    // MARK: - Mock 数据
    private func seedMockData() {
        memories = [
            MemoryModel(
                id: "mem_001",
                title: "上海 · 1975年7月",
                subtitle: "外公结婚纪念日，全家在外滩合影",
                location: "上海外滩",
                year: 1975, month: 7,
                latitude: 31.2397, longitude: 121.4901,
                imageNames: [],
                authorId: "user_001"
            ),
            MemoryModel(
                id: "mem_002",
                title: "北京 · 1988年10月",
                subtitle: "爸爸第一次去北京出差，带回了故宫明信片",
                location: "北京故宫",
                year: 1988, month: 10,
                latitude: 39.9163, longitude: 116.3972,
                imageNames: [],
                authorId: "user_001"
            ),
            MemoryModel(
                id: "mem_003",
                title: "成都 · 2003年5月",
                subtitle: "全家旅行，第一次吃正宗火锅，妈妈辣哭了",
                location: "成都宽窄巷子",
                year: 2003, month: 5,
                latitude: 30.6654, longitude: 104.0498,
                imageNames: [],
                authorId: "user_001"
            ),
            MemoryModel(
                id: "mem_004",
                title: "杭州 · 2015年9月",
                subtitle: "爷爷最后一次看西湖，说这里是他心里最美的地方",
                location: "杭州西湖",
                year: 2015, month: 9,
                latitude: 30.2590, longitude: 120.1532,
                imageNames: [],
                isPrivate: false,
                authorId: "user_001"
            ),
            MemoryModel(
                id: "mem_005",
                title: "广州 · 2022年2月",
                subtitle: "过年回老家，奶奶亲手做的年糕，香极了",
                location: "广州花都",
                year: 2022, month: 2,
                latitude: 23.4034, longitude: 113.2197,
                imageNames: [],
                authorId: "user_001"
            ),
            MemoryModel(
                id: "mem_006",
                title: "南京 · 1990年3月",
                subtitle: "第一次独自出远门，在夫子庙迷了路",
                location: "南京夫子庙",
                year: 1990, month: 3,
                latitude: 32.0408, longitude: 118.7969,
                imageNames: [],
                isPrivate: true,
                authorId: "user_001"
            )
        ]
    }
}
