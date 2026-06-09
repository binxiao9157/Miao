import Foundation
import CocoaLumberjack

// MARK: - 回忆录生成服务

/// 核心业务层：构建 prompt → 调用 DeepSeek API → 解析 JSON → 保存回忆录
/// 使用方式：
///   1. 调用 MemoirService.shared.generateMemoir(dialogMessages:completion:) 传入对话上下文
///   2. 或调用 MemoirService.shared.generateMemoirFromMock() 使用伪造数据测试
final class MemoirService {

    static let shared = MemoirService()

    /// 串行队列，保证同一时间只处理一个生成请求
    private let generateQueue = DispatchQueue(label: "com.dreamjourney.memoir.generate", qos: .userInitiated)

    // MARK: - System Prompt

    /// 指导大模型从对话中提取结构化信息 + 撰写散文
    /// 注意：使用 computed property，每次调用都注入"今天"的真实日期，
    /// 避免大模型基于训练数据猜测年份（会输出 2024/2025 这类过期年份）。
    private var systemPrompt: String {
        let now = Date()
        let calendar = Calendar.current
        let currentYear = calendar.component(.year, from: now)
        let currentMonth = calendar.component(.month, from: now)
        let currentDay = calendar.component(.day, from: now)

        return """
        你是一位擅长为老人撰写回忆录的作家。用户会给你一段老人与AI助手的对话记录，请你从中提取回忆内容，并生成一篇温暖的回忆录。

        【重要 · 当前真实日期】今天是 \(currentYear) 年 \(currentMonth) 月 \(currentDay) 日。请以这个日期为"现在"的基准。

        核心原则：
        - 绝不编造对话中未提及的内容。所有细节必须来自对话原文。
        - 如果对话内容较少，生成的散文就短一些；内容丰富时才写长。
        - 散文长度适应内容量：对话少则100-200字，对话多则300-500字，不要为了凑字数而添加虚构细节。
        - 如果对话中没有明确的时间和地点信息，不要猜测，使用默认值。

        要求：
        1. 从对话中提炼出老人讲述的故事、人物、地点和时间
        2. 以温暖真挚的叙事散文风格撰写正文（prose），第三人称视角穿插第一人称感受
        3. 提取结构化字段：标题（15字以内）、时间描述、年份、月份、地点名称、经纬度、关键人物
        4. 【关键规则】关于 year/month 字段：
           - 如果对话中老人**明确提到**某个具体年份/月份（如"1975年夏天"、"上世纪八十年代"），按对话提到的年月填写
           - 如果对话中**没有提到**任何具体时间，**必须**使用当前真实日期：year=\(currentYear)，month=\(currentMonth)
           - **绝对禁止**输出未来日期，也禁止输出 \(currentYear) 之后的年份
        5. 如果对话中未提到地点，使用默认值"上海"（纬度31.2304，经度121.4737）
        6. 关键人物最多5个，从对话中提取人物称呼即可，对话中未提及人物则返回空数组

        你必须严格以 JSON 格式输出，不要输出任何其他内容。JSON 结构示例（注意：示例的 year/month 仅用于演示格式，不代表你应该输出的实际值）：
        {
          "title": "标题，15字以内",
          "prose": "散文正文，长度随对话内容量调整，绝不编造",
          "timeDescription": "时间描述，如\(currentYear)年\(currentMonth)月",
          "year": \(currentYear),
          "month": \(currentMonth),
          "location": "地点名称",
          "latitude": 31.2304,
          "longitude": 121.4737,
          "keyPeople": ["人物1", "人物2"]
        }
        """
    }

    // MARK: - Generate Memoir

    /// 从对话上下文生成回忆录
    /// - Parameters:
    ///   - dialogMessages: 对话消息列表（用户和AI的对话记录）
    ///   - completion: 回调，主线程返回 Result<MemoirModel, Error>
    func generateMemoir(
        dialogMessages: [DialogMessage],
        completion: @escaping (Result<MemoirModel, Error>) -> Void
    ) {
        generateQueue.async { [weak self] () -> Void in
            guard let self = self else { return }

            // 1. 构建消息列表
            let chatMessages = self.buildChatMessages(from: dialogMessages)

            // 2. 调用 DeepSeek API
            DeepSeekService.shared.chat(messages: chatMessages) { result in
                switch result {
                case .success(let content):
                    // 3. 解析 JSON 响应
                    var memoir = self.parseMemoirResponse(content)

                    // 4. 关联当前用户的 speaker_id（声音复刻音色）
                    if let speakerId = VoiceCloneService.shared.currentSpeakerId {
                        memoir.speakerId = speakerId
                    }

                    // 5. 保存到 Repository
                    DDLogInfo("[MemoirSync] MemoirService → save: id=\(memoir.id), title=\(memoir.title), location=\(memoir.location), lat=\(memoir.latitude), lng=\(memoir.longitude), authorId=\(memoir.authorId)")
                    MemoirRepository.shared.save(memoir)

                    // 注意：音频合成交由 MemoirFlowManager 统一编排
                    // 不再在此处自动触发，避免与声音复刻训练产生竞态

                    // 6. 主线程回调
                    DispatchQueue.main.async {
                        completion(.success(memoir))
                    }

                case .failure(let error):
                    DispatchQueue.main.async {
                        completion(.failure(error))
                    }
                }
            }
        }
    }

    // MARK: - Mock Demo

    /// 使用伪造的对话上下文测试 memoir 生成流程
    /// 用于开发阶段验证，无需真实对话数据
    func generateMemoirFromMock(completion: @escaping (Result<MemoirModel, Error>) -> Void) {
        let mockMessages: [DialogMessage] = [
            DialogMessage(role: "user", text: "我今天想讲讲小时候的事。"),
            DialogMessage(role: "ai", text: "好的，您想聊聊哪段回忆呢？"),
            DialogMessage(role: "user", text: "1968年那会儿，我和你爷爷刚结婚，住在杭州西湖边上的老房子里。那时候日子虽然苦，但每天傍晚我们都会去湖边散步。"),
            DialogMessage(role: "ai", text: "西湖的黄昏一定很美。能再讲讲当时的情景吗？"),
            DialogMessage(role: "user", text: "到了秋天，湖面上的荷叶都黄了，风一吹沙沙响。你爷爷总会摘一朵给我，说'等日子好了，天天给你买花'。那时候哪有花店，路边的野花就是最好的了。"),
            DialogMessage(role: "ai", text: "这些细节太珍贵了。您爷爷后来怎么样了？"),
            DialogMessage(role: "user", text: "后来啊，他在厂里干了一辈子，退了休还是每天陪我去湖边走走。走不动了就坐长椅上看夕阳。算起来，西湖陪了我们五十多年。"),
            DialogMessage(role: "ai", text: "五十多年的相伴，西湖见证了你们的爱情。非常感人。"),
        ]

        generateMemoir(dialogMessages: mockMessages, completion: completion)
    }

    // MARK: - Private: Build Chat Messages

    /// 将对话消息转换为 DeepSeek API 所需的格式
    private func buildChatMessages(from dialogMessages: [DialogMessage]) -> [DeepSeekService.ChatMessage] {
        var messages: [DeepSeekService.ChatMessage] = []

        // System prompt
        messages.append(DeepSeekService.ChatMessage(role: "system", content: systemPrompt))

        // 对话上下文
        for msg in dialogMessages {
            let role = (msg.role == "user") ? "user" : "assistant"
            messages.append(DeepSeekService.ChatMessage(role: role, content: msg.text))
        }

        // 追加一句引导，确保模型输出 JSON
        messages.append(DeepSeekService.ChatMessage(
            role: "user",
            content: "请根据以上对话内容，为我生成一篇回忆录，直接输出 JSON。"
        ))

        return messages
    }

    // MARK: - Private: Parse Response

    /// 解析 DeepSeek 返回的内容为 MemoirModel
    /// 支持两种情况：
    ///   1. 纯 JSON — 直接解析
    ///   2. Markdown 代码块包裹的 JSON — 提取后解析
    /// 解析失败时使用回退策略：整段文本作为 prose
    private func parseMemoirResponse(_ content: String) -> MemoirModel {
        // 尝试提取 JSON
        let jsonString = extractJSON(from: content)

        guard let jsonData = jsonString.data(using: .utf8),
              let dict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            // 回退策略：整段文本作为散文
            DDLogInfo("[MemoirService] JSON 解析失败，使用回退策略。原始内容: \(content.prefix(200))")
            return createFallbackMemoir(from: content)
        }

        let now = Date()
        let calendar = Calendar.current
        let defaultYear = calendar.component(.year, from: now)
        let defaultMonth = calendar.component(.month, from: now)

        let title = dict["title"] as? String ?? "一段珍贵的回忆"
        let prose = dict["prose"] as? String ?? content
        let timeDescription = dict["timeDescription"] as? String ?? "\(defaultYear)年\(defaultMonth)月"
        let year = dict["year"] as? Int ?? defaultYear
        let month = dict["month"] as? Int ?? defaultMonth
        let location = dict["location"] as? String ?? "上海"
        let modelLat = dict["latitude"] as? Double ?? 31.2304
        let modelLng = dict["longitude"] as? Double ?? 121.4737
        let keyPeople = dict["keyPeople"] as? [String] ?? []

        // 经纬度兜底：模型对小地名/景点容易瞎给经纬度，导致地图标注偏离。
        // 用本地常见城市字典对 location 做"包含"匹配，命中则用字典坐标覆盖模型值。
        let (latitude, longitude) = Self.resolveCoordinate(
            for: location,
            fallbackLat: modelLat,
            fallbackLng: modelLng
        )
        DDLogInfo("[MemoirService] resolveCoordinate: location=\(location), modelLat=\(modelLat), modelLng=\(modelLng) → finalLat=\(latitude), finalLng=\(longitude)")

        return MemoirModel(
            title: title,
            prose: prose,
            timeDescription: timeDescription,
            year: year,
            month: month,
            location: location,
            latitude: latitude,
            longitude: longitude,
            keyPeople: keyPeople
        )
    }

    // MARK: - City Coordinate Lookup
    /// 常见城市坐标字典（以城市/省级行政中心为基准）。
    /// 模型对小地名经纬度不可靠，所以只要 location 包含这些城市名，就用字典坐标覆盖。
    private static let cityCoordinates: [(name: String, lat: Double, lng: Double)] = [
        ("北京", 39.9042, 116.4074),
        ("上海", 31.2304, 121.4737),
        ("广州", 23.1291, 113.2644),
        ("深圳", 22.5431, 114.0579),
        ("天津", 39.0842, 117.2009),
        ("重庆", 29.5630, 106.5516),
        ("成都", 30.6724, 104.0633),
        ("杭州", 30.2741, 120.1551),
        ("南京", 32.0603, 118.7969),
        ("苏州", 31.2989, 120.5853),
        ("无锡", 31.4900, 120.3119),
        ("武汉", 30.5928, 114.3055),
        ("西安", 34.3416, 108.9398),
        ("郑州", 34.7466, 113.6253),
        ("长沙", 28.2282, 112.9388),
        ("沈阳", 41.8057, 123.4315),
        ("大连", 38.9140, 121.6147),
        ("青岛", 36.0671, 120.3826),
        ("济南", 36.6512, 117.1201),
        ("厦门", 24.4798, 118.0894),
        ("福州", 26.0745, 119.2965),
        ("哈尔滨", 45.8038, 126.5350),
        ("长春", 43.8170, 125.3235),
        ("昆明", 25.0389, 102.7183),
        ("贵阳", 26.6470, 106.6302),
        ("南宁", 22.8170, 108.3669),
        ("拉萨", 29.6500, 91.1000),
        ("乌鲁木齐", 43.8256, 87.6168),
        ("兰州", 36.0611, 103.8343),
        ("银川", 38.4872, 106.2309),
        ("西宁", 36.6232, 101.7782),
        ("呼和浩特", 40.8425, 111.7491),
        ("石家庄", 38.0428, 114.5149),
        ("太原", 37.8706, 112.5505),
        ("合肥", 31.8206, 117.2272),
        ("南昌", 28.6820, 115.8579),
        ("海口", 20.0440, 110.1989),
        ("三亚", 18.2528, 109.5119),
        ("台北", 25.0330, 121.5654),
        ("香港", 22.3193, 114.1694),
        ("澳门", 22.1987, 113.5439),
    ]

    /// 在 location 字符串中查找命中的城市名，返回字典坐标；未命中则回退给模型值。
    private static func resolveCoordinate(
        for location: String,
        fallbackLat: Double,
        fallbackLng: Double
    ) -> (Double, Double) {
        for entry in cityCoordinates where location.contains(entry.name) {
            return (entry.lat, entry.lng)
        }
        return (fallbackLat, fallbackLng)
    }

    /// 从内容中提取 JSON 字符串
    /// 支持: 纯 JSON、```json ... ``` 代码块、``` ... ``` 代码块
    private func extractJSON(from content: String) -> String {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)

        // 情况 1: 整个内容就是 JSON（以 { 开头）
        if trimmed.hasPrefix("{") {
            // 找到最后一个 } 的位置
            if let lastBrace = trimmed.lastIndex(of: "}") {
                return String(trimmed[...lastBrace])
            }
            return trimmed
        }

        // 情况 2: ```json ... ``` 代码块
        if let jsonBlockRange = trimmed.range(of: "```json\\s*\\n?([\\s\\S]*?)\\n?```", options: .regularExpression) {
            let blockContent = String(trimmed[jsonBlockRange])
            // 提取 ```json 和 ``` 之间的内容
            if let start = blockContent.range(of: "```json"),
               let end = blockContent.range(of: "```", options: .backwards) {
                let inner = blockContent[start.upperBound..<end.lowerBound]
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                return inner
            }
        }

        // 情况 3: ``` ... ``` 代码块（无语言标记）
        if let codeBlockRange = trimmed.range(of: "```\\s*\\n?([\\s\\S]*?)\\n?```", options: .regularExpression) {
            let blockContent = String(trimmed[codeBlockRange])
            if let start = blockContent.range(of: "```"),
               let end = blockContent.range(of: "```", options: .backwards) {
                let inner = blockContent[start.upperBound..<end.lowerBound]
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                return inner
            }
        }

        // 情况 4: 尝试找到内容中第一个 { 到最后一个 } 的部分
        if let firstBrace = trimmed.firstIndex(of: "{"),
           let lastBrace = trimmed.lastIndex(of: "}") {
            return String(trimmed[firstBrace...lastBrace])
        }

        return trimmed
    }

    /// 回退策略：JSON 解析失败时，将整段文本作为散文
    private func createFallbackMemoir(from rawText: String) -> MemoirModel {
        let now = Date()
        let calendar = Calendar.current

        // 尝试从文本第一行提取标题
        let firstLine = rawText.components(separatedBy: .newlines).first?.trimmingCharacters(in: .whitespaces) ?? ""
        let title = firstLine.count <= 15 ? firstLine : "一段珍贵的回忆"

        return MemoirModel(
            title: title,
            prose: rawText,
            timeDescription: "\(calendar.component(.year, from: now))年\(calendar.component(.month, from: now))月",
            year: calendar.component(.year, from: now),
            month: calendar.component(.month, from: now),
            location: "上海",
            latitude: 31.2304,
            longitude: 121.4737,
            keyPeople: []
        )
    }

    // MARK: - TTS 音频合成（由 MemoirFlowManager 统一编排，不再在此自动触发）
}