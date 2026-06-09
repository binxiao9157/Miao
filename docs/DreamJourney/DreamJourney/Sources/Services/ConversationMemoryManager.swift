import Foundation

// MARK: - 数据模型

/// 单轮对话记录
struct ConversationTurn: Codable {
    let role: String     // "user" / "ai"
    let text: String
    let timestamp: Date
}

/// 回忆录四维度摘要（核心数据结构）
/// 所有摘要和开场白都围绕这四个维度组织
struct MemorySummary: Codable {
    var time: String = ""       // 时间：如"1968年"、"小时候"、"退休那几年"
    var place: String = ""      // 地点：如"杭州西湖边"、"老家四川"
    var person: String = ""     // 人物：如"爷爷"、"老伴"、"张老师"
    var event: String = ""      // 事件：如"结婚"、"在工厂上班"、"学做饭"

    /// 是否至少包含一个有意义的维度
    var hasAnyDimension: Bool {
        !time.isEmpty || !place.isEmpty || !person.isEmpty || !event.isEmpty
    }

    /// 有意义的维度数量
    var dimensionCount: Int {
        [!time.isEmpty, !place.isEmpty, !person.isEmpty, !event.isEmpty].filter { $0 }.count
    }

    /// 是否具备足够的上下文来生成关联开场白（至少2个维度）
    var isRichEnough: Bool {
        dimensionCount >= 2
    }

    /// 生成一句话自然摘要（用于开场白和记忆上下文）
    /// 示例："小时候在老家跟爷爷一起做饭"
    func toNaturalSentence() -> String {
        var parts: [String] = []
        if !time.isEmpty { parts.append(time) }
        if !place.isEmpty { parts.append(place) }
        if !person.isEmpty { parts.append("跟\(person)") }
        if !event.isEmpty { parts.append(event) }

        if parts.isEmpty { return "" }

        // 根据维度组合生成自然语句
        if !time.isEmpty && !place.isEmpty && !person.isEmpty && !event.isEmpty {
            return "\(time)在\(place)跟\(person)\(event)"
        }
        if !time.isEmpty && !place.isEmpty && !event.isEmpty {
            return "\(time)在\(place)\(event)"
        }
        if !time.isEmpty && !person.isEmpty && !event.isEmpty {
            return "\(time)跟\(person)\(event)"
        }
        if !place.isEmpty && !person.isEmpty && !event.isEmpty {
            return "在\(place)跟\(person)\(event)"
        }
        // 两维度
        if !time.isEmpty && !event.isEmpty {
            return "\(time)\(event)"
        }
        if !place.isEmpty && !event.isEmpty {
            return "在\(place)\(event)"
        }
        if !person.isEmpty && !event.isEmpty {
            return "跟\(person)\(event)"
        }
        if !time.isEmpty && !place.isEmpty {
            return "\(time)在\(place)的事"
        }
        if !time.isEmpty && !person.isEmpty {
            return "\(time)跟\(person)的事"
        }
        if !place.isEmpty && !person.isEmpty {
            return "在\(place)跟\(person)的事"
        }
        // 单维度
        if !event.isEmpty { return event }
        if !time.isEmpty { return "\(time)的事" }
        if !place.isEmpty { return "在\(place)的事" }
        if !person.isEmpty { return "跟\(person)的事" }
        return ""
    }
}

/// 对话记忆（跨会话持久化）
struct ConversationMemory: Codable {
    var lastSessionDate: Date = Date()
    var lastSummary: MemorySummary = MemorySummary()  // 上次对话的四维度摘要
    var sessionCount: Int = 0                          // 累计对话次数
    var recentTranscript: [ConversationTurn] = []      // 最近一次对话记录（最多保留20轮）

    // 兼容旧数据迁移
    var mentionedPeople: [String] = []
    var mentionedPlaces: [String] = []
    var mentionedFoods: [String] = []
    var lastTopic: String = ""
    var recentTopics: [String] = []
}

// MARK: - ConversationMemoryManager

/// 对话记忆管理器 - 围绕时间/地点/人物/事件四维度提取摘要
final class ConversationMemoryManager {

    static let shared = ConversationMemoryManager()
    private init() { load() }

    // MARK: - Public

    /// 当前持久化的记忆
    private(set) var currentMemory = ConversationMemory()

    /// 当前会话的临时对话记录
    private var currentTranscript: [ConversationTurn] = []

    /// 获取当前会话的对话记录（用于回忆录生成等）
    func getCurrentTranscript() -> [ConversationTurn] {
        if !currentTranscript.isEmpty {
            return currentTranscript
        }
        return currentMemory.recentTranscript
    }

    // MARK: - 记录对话

    func recordUserTurn(text: String) {
        guard !text.isEmpty else { return }
        let turn = ConversationTurn(role: "user", text: text, timestamp: Date())
        currentTranscript.append(turn)
        print("[Memory] 📝 记录用户: \(text.prefix(50))")
    }

    func recordAITurn(text: String) {
        guard !text.isEmpty else { return }
        let turn = ConversationTurn(role: "ai", text: text, timestamp: Date())
        currentTranscript.append(turn)
        print("[Memory] 📝 记录AI: \(text.prefix(50))")
    }

    /// 对话结束时调用：提取四维度摘要并持久化
    func endSession() {
        guard !currentTranscript.isEmpty else { return }

        // 提取四维度摘要
        currentMemory.lastSummary = extractFourDimensionSummary()

        // 更新元数据
        currentMemory.lastSessionDate = Date()
        currentMemory.sessionCount += 1
        currentMemory.recentTranscript = Array(currentTranscript.suffix(20))

        // 清理旧字段
        currentMemory.mentionedPeople = []
        currentMemory.mentionedPlaces = []
        currentMemory.mentionedFoods = []
        currentMemory.lastTopic = ""
        currentMemory.recentTopics = []

        // 持久化
        save()

        // 清空当前会话临时记录
        currentTranscript = []

        let s = currentMemory.lastSummary
        print("[Memory] ✅ 会话摘要已保存 (第\(currentMemory.sessionCount)次对话)")
        print("[Memory]   时间: \(s.time)")
        print("[Memory]   地点: \(s.place)")
        print("[Memory]   人物: \(s.person)")
        print("[Memory]   事件: \(s.event)")
        print("[Memory]   自然摘要: \(s.toNaturalSentence())")
    }

    // MARK: - 四维度摘要提取

    /// 从对话中提取时间/地点/人物/事件四维度摘要
    private func extractFourDimensionSummary() -> MemorySummary {
        let userTexts = currentTranscript
            .filter { $0.role == "user" }
            .map { $0.text }
        let userAllText = userTexts.joined(separator: " ")

        var summary = MemorySummary()

        // 1. 提取时间
        summary.time = extractTime(from: userAllText)

        // 2. 提取地点
        summary.place = extractPlace(from: userAllText)

        // 3. 提取人物
        summary.person = extractPerson(from: userAllText)

        // 4. 提取事件
        summary.event = extractEvent(from: userAllText, userTexts: userTexts)

        return summary
    }

    // MARK: - 时间提取

    /// 从文本中提取时间描述
    private func extractTime(from text: String) -> String {
        // 精确的时间表达
        let exactTimePatterns = [
            // 年份
            (pattern: "(\\d{4})年", type: "year"),
        ]

        // 检查精确年份
        if let regex = try? NSRegularExpression(pattern: "(\\d{3,4})年"),
           let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) {
            if let range = Range(match.range(at: 0), in: text) {
                return String(text[range])  // 如"1968年"
            }
        }

        // 模糊时间关键词（按优先级）
        let timeKeywords = [
            "小时候", "年轻时候", "年轻那会儿", "年轻时",
            "上学那会儿", "刚工作那会儿", "结婚那会儿",
            "以前", "那时候", "那会儿",
            "退休前", "退休以后", "退休后",
            "过年", "过节", "中秋节", "端午节",
        ]
        for keyword in timeKeywords {
            if text.contains(keyword) {
                return keyword
            }
        }

        return ""
    }

    // MARK: - 地点提取

    /// 从文本中提取地点描述
    private func extractPlace(from text: String) -> String {
        // 精确城市名
        let cities = [
            "北京", "上海", "广州", "深圳", "杭州", "南京", "苏州",
            "成都", "重庆", "武汉", "长沙", "西安", "天津", "青岛",
            "东北", "四川", "湖南", "湖北", "广东", "江西", "安徽", "河南", "山东",
        ]
        for city in cities {
            if text.contains(city) {
                // 尝试提取更完整的地名
                return extractContextAround(keyword: city, in: text, prefixLen: 2, suffixLen: 1)
            }
        }

        // 模糊地点
        let placeKeywords = [
            "老家", "老房子", "村里", "乡下",
            "学校", "工厂", "部队", "医院",
        ]
        for keyword in placeKeywords {
            if text.contains(keyword) {
                return extractContextAround(keyword: keyword, in: text, prefixLen: 2, suffixLen: 1)
            }
        }

        return ""
    }

    // MARK: - 人物提取

    /// 从文本中提取人物描述
    private func extractPerson(from text: String) -> String {
        let peopleKeywords = [
            "爷爷", "奶奶", "外婆", "外公", "姥姥", "姥爷",
            "爸爸", "妈妈", "父亲", "母亲",
            "老伴", "老公", "老婆", "丈夫", "妻子",
            "哥哥", "姐姐", "弟弟", "妹妹",
            "叔叔", "阿姨", "舅舅", "姑姑",
            "儿子", "女儿", "孙子", "孙女",
            "老师", "师傅", "邻居", "同学", "战友",
        ]
        for keyword in peopleKeywords {
            if text.contains(keyword) {
                return keyword
            }
        }
        return ""
    }

    // MARK: - 事件提取

    /// 从文本中提取事件描述
    private func extractEvent(from text: String, userTexts: [String]) -> String {
        // 事件关键词
        let eventKeywords = [
            "结婚", "上学", "工作", "退休", "当兵", "搬家",
            "生孩子", "生了个", "做饭", "种地", "打工",
            "赶集", "学手艺", "出国", "下海",
        ]
        for keyword in eventKeywords {
            if text.contains(keyword) {
                return extractContextAround(keyword: keyword, in: text, prefixLen: 2, suffixLen: 2)
            }
        }

        // 从有意义的用户语句中提取最后一条作为事件
        let meaningful = userTexts.filter { isMeaningfulStatement($0) }
        if let last = meaningful.last {
            let trimmed = String(last.prefix(15)).trimmingCharacters(in: .whitespaces)
            return trimmed
        }

        return ""
    }

    // MARK: - 辅助方法

    /// 在关键词前后提取上下文，形成更完整的描述
    private func extractContextAround(keyword: String, in text: String, prefixLen: Int, suffixLen: Int) -> String {
        guard let range = text.range(of: keyword) else { return keyword }
        let startIdx = text.index(range.lowerBound, offsetBy: -prefixLen, limitedBy: text.startIndex) ?? text.startIndex
        let endIdx = text.index(range.upperBound, offsetBy: suffixLen, limitedBy: text.endIndex) ?? text.endIndex
        let context = String(text[startIdx..<endIdx]).trimmingCharacters(in: .whitespaces)
        return context.count >= keyword.count ? context : keyword
    }

    /// 判断一段文本是否是有意义的陈述（非寒暄/应答/模板）
    private func isMeaningfulStatement(_ text: String) -> Bool {
        let trimmed = text.trimmingCharacters(in: .whitespaces)

        guard trimmed.count >= 3 else { return false }

        // 黑名单
        let blacklist = [
            "你好", "您好", "嗳", "嗯", "啊", "哦", "好", "好的", "好吧",
            "行", "可以", "对", "是", "不是", "没有", "有",
            "谢谢", "不客气", "再见", "拜拜",
            "嘿", "嗨", "哈", "哈哈", "呵呵",
            "不知道", "忘了", "想不起来",
            "帮我生成回忆录", "生成回忆录", "回忆录",
        ]
        if blacklist.contains(where: { trimmed == $0 }) { return false }

        // 模板句式
        let templates = [
            "又来找我", "又见面啦", "上次您跟我说", "上回咱们聊到",
            "我一直记着", "今天想聊点什么", "今天想呢",
            "您好呀，我是寻梦环游", "我是寻梦环游", "想跟您聊聊天",
            "上次聊的", "我可还记得",
        ]
        if templates.contains(where: { trimmed.contains($0) }) { return false }

        // 至少4字且非纯应答
        return trimmed.count >= 4
    }

    // MARK: - 持久化

    private var filePath: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return docs.appendingPathComponent("conversation_memory.json")
    }

    private func save() {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = .prettyPrinted
        guard let data = try? encoder.encode(currentMemory) else { return }
        try? data.write(to: filePath)
    }

    private func load() {
        guard FileManager.default.fileExists(atPath: filePath.path) else { return }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        guard let data = try? Data(contentsOf: filePath),
              let memory = try? decoder.decode(ConversationMemory.self, from: data) else { return }
        currentMemory = memory
        let s = memory.lastSummary
        print("[Memory] 📂 已加载历史记忆 (第\(memory.sessionCount)次)")
        print("[Memory]   时间: \(s.time), 地点: \(s.place), 人物: \(s.person), 事件: \(s.event)")
    }
}
