import Foundation

// MARK: - 对话消息（输入给大模型的上下文单元）
struct DialogMessage: Codable {
    let role: String      // "user" / "ai"
    let text: String
    let timestamp: Date

    init(role: String, text: String, timestamp: Date = Date()) {
        self.role = role
        self.text = text
        self.timestamp = timestamp
    }
}

// MARK: - 回忆录模型
struct MemoirModel: Codable, Identifiable {
    let id: String
    var title: String            // 标题，如"上海外滩的记忆"
    var prose: String            // 散文正文（300-800字）
    var timeDescription: String  // 时间描述，如"1975年7月"
    var year: Int                // 结构化年份
    var month: Int               // 结构化月份
    var location: String         // 地点名称
    var latitude: Double         // 纬度
    var longitude: Double        // 经度
    var keyPeople: [String]      // 关键人物列表
    var isPrivate: Bool
    var authorId: String
    var createdAt: Date
    var updatedAt: Date

    // MARK: - 语音相关字段
    var sessionId: String?       // 关联的对话会话 ID（用于关联录音）
    var speakerId: String?       // 声音复刻训练后的音色 ID
    var audioFileName: String?   // 合成后的回忆录朗读音频文件名（本地缓存）

    init(id: String = UUID().uuidString,
         title: String,
         prose: String,
         timeDescription: String,
         year: Int,
         month: Int,
         location: String,
         latitude: Double = 31.2304,
         longitude: Double = 121.4737,
         keyPeople: [String] = [],
         isPrivate: Bool = false,
         authorId: String = "user_001",
         sessionId: String? = nil,
         speakerId: String? = nil,
         audioFileName: String? = nil) {
        self.id = id
        self.title = title
        self.prose = prose
        self.timeDescription = timeDescription
        self.year = year
        self.month = month
        self.location = location
        self.latitude = latitude
        self.longitude = longitude
        self.keyPeople = keyPeople
        self.isPrivate = isPrivate
        self.authorId = authorId
        self.sessionId = sessionId
        self.speakerId = speakerId
        self.audioFileName = audioFileName
        self.createdAt = Date()
        self.updatedAt = Date()
    }

    // MARK: - 音频播放状态（非持久化，运行时使用）
    /// 音频是否已合成（本地存在音频文件）
    var hasAudio: Bool {
        return audioFileName != nil
    }
}

// MARK: - 声音复刻训练状态
enum VoiceCloneStatus: Int, Codable {
    case notFound = 0     // 未创建
    case training = 1     // 训练中
    case success = 2      // 训练成功，可用于 TTS
    case failed = 3       // 训练失败
    case active = 4       // 已激活
}