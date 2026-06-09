import Foundation

// MARK: - 回忆模型
struct MemoryModel: Codable, Identifiable {
    let id: String
    var title: String           // 标题，如"上海 · 1975年7月"
    var subtitle: String        // 事件描述（短摘要，地图气泡用）
    var fullContent: String?    // 完整生成内容（散文 prose），详情页正文使用；老数据可能为 nil
    var location: String        // 地点名称
    var year: Int               // 年份
    var month: Int              // 月份
    var latitude: Double        // 纬度
    var longitude: Double       // 经度
    var imageNames: [String]    // 本地图片名列表
    var audioName: String?      // 本地音频文件名（同时作为原始对话录音的 sessionId，用于查找 recordings/{audioName}.m4a）
    var isPrivate: Bool         // 是否私密
    var createdAt: Date
    var updatedAt: Date
    var comments: [CommentModel]
    var likes: [LikeModel]      // 点赞列表
    var supplements: [SupplementModel]  // 亲属补充内容
    var authorId: String

    init(id: String = UUID().uuidString,
         title: String,
         subtitle: String,
         fullContent: String? = nil,
         location: String,
         year: Int,
         month: Int,
         latitude: Double = 31.2304,
         longitude: Double = 121.4737,
         imageNames: [String] = [],
         audioName: String? = nil,
         isPrivate: Bool = false,
         authorId: String = "user_001") {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.fullContent = fullContent
        self.location = location
        self.year = year
        self.month = month
        self.latitude = latitude
        self.longitude = longitude
        self.imageNames = imageNames
        self.audioName = audioName
        self.isPrivate = isPrivate
        self.createdAt = Date()
        self.updatedAt = Date()
        self.comments = []
        self.likes = []
        self.supplements = []
        self.authorId = authorId
    }

    /// 当前用户是否已点赞
    func isLikedBy(userId: String) -> Bool {
        return likes.contains { $0.userId == userId }
    }
}

// MARK: - 评论模型
struct CommentModel: Codable, Identifiable {
    let id: String
    var authorId: String
    var authorName: String
    var content: String
    var createdAt: Date

    init(id: String = UUID().uuidString,
         authorId: String,
         authorName: String,
         content: String) {
        self.id = id
        self.authorId = authorId
        self.authorName = authorName
        self.content = content
        self.createdAt = Date()
    }
}

// MARK: - 用户模型
struct UserModel: Codable {
    var id: String
    var nickname: String
    var phone: String           // 明文手机号（本地存储）
    var avatarName: String?     // 系统 SF Symbol 名称作为头像占位

    var maskedPhone: String {
        guard phone.count >= 11 else { return phone }
        let start = phone.prefix(3)
        let end = phone.suffix(4)
        return "\(start)****\(end)"
    }

    var recordYears: Int {
        // Mock：基于 id 计算年数
        return 75
    }
}

// MARK: - 亲属模型
struct FamilyMember: Codable, Identifiable {
    let id: String
    var name: String
    var relation: String        // "祖母"/"父亲"/"母亲"/"子女"/"配偶"等
    var phone: String?
    var avatarName: String?
    var joinedAt: Date
    /// 在线状态：true=在线，false=离线
    var isOnline: Bool
    /// 最近更新描述，如“2小时前”“昨天”“刚刚”
    var lastUpdated: String

    init(id: String = UUID().uuidString, name: String, relation: String,
         phone: String? = nil, isOnline: Bool = false, lastUpdated: String = "未知") {
        self.id = id
        self.name = name
        self.relation = relation
        self.phone = phone
        self.avatarName = nil
        self.joinedAt = Date()
        self.isOnline = isOnline
        self.lastUpdated = lastUpdated
    }
}

// MARK: - 点赞模型
struct LikeModel: Codable, Identifiable {
    let id: String
    var userId: String
    var userName: String
    var createdAt: Date

    init(id: String = UUID().uuidString, userId: String, userName: String) {
        self.id = id
        self.userId = userId
        self.userName = userName
        self.createdAt = Date()
    }
}

// MARK: - 补充回忆模型（亲属补充内容）
struct SupplementModel: Codable, Identifiable {
    let id: String
    var authorId: String
    var authorName: String
    var content: String
    var createdAt: Date

    init(id: String = UUID().uuidString, authorId: String, authorName: String, content: String) {
        self.id = id
        self.authorId = authorId
        self.authorName = authorName
        self.content = content
        self.createdAt = Date()
    }
}
