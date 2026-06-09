import Foundation
import AVFoundation
import CocoaLumberjack
import SpeechEngineToB

// MARK: - 对话结束原因

enum DialogEndReason {
    case manual            // 用户手动停止
    case keyword(String)   // 识别到结束关键词
    case silenceTimeout    // 静音超时
    case serverEnded       // 服务端结束
}

// MARK: - DialogEngineDelegate 协议

/// Dialog 引擎对外回调协议
protocol DialogEngineDelegate: AnyObject {
    func onDialogStarted()
    func onASRResult(text: String, isFinal: Bool)
    func onTTSStarted(text: String)
    func onTTSFinished()
    func onChatStreaming(text: String)
    func onError(error: Error)
    func onDialogEnded(reason: DialogEndReason)
}

// MARK: - DialogEngineManager

/// Dialog 语音对话引擎管理器 - 直接封装火山引擎 SpeechEngineToB SDK
/// 提供语音对话的启动、停止、生命周期管理
final class DialogEngineManager: NSObject {

    // MARK: - Singleton

    static let shared = DialogEngineManager()

    // MARK: - Properties

    weak var delegate: DialogEngineDelegate?

    /// 引擎是否就绪（已初始化完成）
    private(set) var isEngineReady = false

    /// 是否有活跃对话
    private(set) var isDialogActive = false

    /// AI 是否正在语音播报中（用于判断是否需要打断）
    private(set) var isAISpeaking = false

    /// 是否正在结束对话中（防止关键词触发后继续处理事件）
    private(set) var isEnding = false
    /// 当前话题（由业务层设置，注入到 system_role 末尾）
    var currentTopic: String?

    // MARK: - Configuration

    /// 火山引擎 Dialog 服务配置
    struct Config {
        /// 从火山控制台获取的 AppID
        var appID: String = ""
        /// 从火山控制台获取的 AppKey
        var appKey: String = ""
        /// 从火山控制台获取的 AccessToken
        var token: String = ""
        /// 用户唯一标识（用于日志追踪）
        var uid: String = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
        /// Dialog 服务地址
        var address: String = "wss://openspeech.bytedance.com"
        /// Dialog 服务 URI
        var uri: String = "/api/v3/realtime/dialogue"
        /// 资源 ID
        var resourceID: String = "volc.speech.dialog"
        /// 是否启用 SDK 软件 AEC 回声消除（需要 AEC 模型文件，iOS 硬件 AEC 通过 AVAudioSession voiceChat 模式已生效）
        var enableAEC: Bool = false
        /// 是否启用内置播放器
        var enablePlayer: Bool = true

        // MARK: - 对话能力配置

        /// Bot 名称
        var botName: String = "寻梦环游"

        /// System Prompt - 家庆回忆录 AI 人格设定
        var systemPrompt: String = """
            你是「寻梦环游」，一位温暖、耐心、善于倾听的家族历史学家和传记作家。\
            你的工作是通过温和的提问，引导长辈回忆人生中的重要时刻、情感体验和细节，帮他们把记忆变成可以传递给家人的故事。

            【核心原则】
            1. 多问开放式问题（“什么样的”“什么味道”“谁做的”），避免是非题。
            2. 每个话题至少追问一个感官细节（味道、声音、颜色、触感、气味）。
            3. 对长辈的每句话给予积极回应，绝不评判“记错了”或“这不重要”。
            4. 说话短、慢、亲，不用长句，不用专业术语，像跟自家奶奶聊天。
            5. 触及伤痛时不追问，先共情陪伴。原则——不追问伤痛，只陪伴伤痛。

            【语音节奏】
            - 每轮回复不超过2句话。
            - 说完一个问题后留出停顿，等长辈想，不要急着接话。
            - 长辈说话时绝不打断，哪怕重复了。
            - 重要反馈重复一遍：“您说的锅巴饭，焦黄焦黄的——是那个焦黄焦黄的锅巴饭对吧？”

            【对话节奏】
            - 每轮只追问一个点，不贪多。
            - 长辈说完后，先反馈你听到了什么，再追问。
            - 话题转换跟着食物链、味道链、人物链走，不硬跳。
            - 苦难至少给2轮空间，不急着转轻。
            - 不用“回忆”“铭记”“传承”等大词，用“记得”“说说”“讲讲”。

            【话题引导框架（5层，但不强制线性）】
            1. 根（家在哪里）：小时候住的地方、门口的树/井/河、现在变了什么样。
            2. 味（吃的故事）：过年吃什么、谁做的、小时候最馅什么。
            3. 人（最亲的人）：谁最疼您、小时候谁管您最严。追问五感：声音、手、走路、习惯动作、口头禅。
            4. 事（重要时刻）：这辈子最不容易的日子、最开心的一天。
            5. 传（想留下的）：什么手艺是从上一辈学来的、想给后辈留什么。追问传承线：谁教您→您教了谁→现在谁在做。

            【感官追问】
            - 食物：什么味道？谁做的？用什么柴？出锅第一口什么感觉？
            - 地方：什么颜色？什么气味？
            - 人物：说话什么声音？手摸起来粗糙还是软的？有什么口头禅？
            - 事件：当时穿的什么？天气怎么样？心里什么感觉？

            【情绪应对】
            - 长时间沉默：等待，不追问。
            - 哽咽/声音颤抖：停止追问，说“那段日子确实不容易……不说了吧”。
            - 笑出声：追问细节，这是金矿！
            - 语速突然变快：放慢自己语速，引导展开。
            - 叹气：共情回应“是啊……”然后给停顿。
            - 重复说同一件事：说明这件事很重要，不打断、不提醒“您说过”。

            【方言处理】
            遇到方言词/地方说法时，追问含义：“这个在您老家是什么意思？”
            """

        /// 开场白问题库（每次随机选一个播报，为空则不播报）
        var greetings: [String] = [
            "您好呀，我是寻梦环游，今天想跟您说说话不？",
            "又见面啦，今天过得怎么样？",
            "您好，最近有什么开心的事想说说吗？",
            "喔，您来啦，今天想聊点什么？",
            "您好呀，今天有什么新鲜事想跟我讲讲？",
            "您好，今天天气怎么样？跟我聊聊呗？",
            "又是新的一天，想跟您说说话，您有空不？"
        ]

        /// ASR 热词列表（提升识别准确率）
        var hotwords: [String] = [
            "寻梦环游", "家书", "回忆录", "老家",
            "锅巴饭", "大灶", "柴火", "过年",
            "奶奶", "爷爷", "外婆", "外公",
            "小时候", "老房子", "手艺", "传承"
        ]

        /// TTS 语速倍率（0.8 = 比正常慢 1.2 倍，适老）
        var speechRate: Double = 0.8

        // MARK: - 对话结束机制

        /// 触发结束对话的关键词列表（ASR 识别结果包含其中任一则结束）
        var endKeywords: [String] = [
            "生成回忆录", "生成家书", "写家书",
            "停止", "结束", "不聊了", "再见",
            "我要去忙了", "先这样吧", "下次再聊"
        ]

        /// 静音超时时长（秒），无语音输入超过此时间自动结束对话
        var silenceTimeoutSeconds: TimeInterval = 60
    }

    /// 当前配置
    var config = Config()

    // MARK: - Private

    private var engine: SpeechEngine?
    private var isSettingUp = false

    /// 静音超时计时器
    private var silenceTimer: Timer?

    /// 当前对话结束原因（用于回调时传递）
    private var pendingEndReason: DialogEndReason = .manual

    /// AI 回复流式拼接缓冲区
    private var chatBuffer: String = ""

    private override init() {
        super.init()
        // 从 Info.plist 读取火山引擎配置
        if let appID = Bundle.main.object(forInfoDictionaryKey: "VolcEngineAppID") as? String,
           !appID.isEmpty {
            config.appID = appID
        }
        if let appKey = Bundle.main.object(forInfoDictionaryKey: "VolcEngineAppKey") as? String,
           !appKey.isEmpty {
            config.appKey = appKey
        }
        if let token = Bundle.main.object(forInfoDictionaryKey: "VolcEngineAppToken") as? String,
           !token.isEmpty {
            config.token = token
        }
    }

    // MARK: - Public API

    /// 配置 Token（由业务层获取后注入）
    func configure(token: String) {
        config.token = token
    }

    /// 客户端主动打断 AI 回复（仅在 AI 正在播报时生效）
    func interruptAI() {
        guard isDialogActive, isAISpeaking, let engine = engine else { return }
        let result = engine.send(SEDirectiveEventClientInterrupt, data: "{}")
        if result == SENoError {
            isAISpeaking = false
            print("[DialogEngine] ✅ 已打断 AI 播报")
            DDLogInfo("[DialogEngine] 客户端打断 AI")
        } else {
            print("[DialogEngine] ⚠️ 打断指令发送失败: \(result.rawValue)")
        }
    }

    /// 初始化引擎（预加载）
    func setup() {
        guard !isEngineReady else {
            DDLogInfo("[DialogEngine] 引擎已就绪，跳过重复初始化")
            return
        }

        guard !isSettingUp else {
            DDLogInfo("[DialogEngine] 正在初始化中，跳过")
            return
        }

        isSettingUp = true

        // 准备环境（首次调用）
        SpeechEngine.prepareEnvironment()

        // 创建引擎实例
        let speechEngine = SpeechEngine()
        let created = speechEngine.createEngine(with: self)
        guard created else {
            DDLogError("[DialogEngine] createEngine 失败")
            isSettingUp = false
            delegate?.onError(error: DialogEngineError.initFailed(code: -1))
            return
        }

        // 配置引擎参数
        configureEngine(speechEngine)

        // 初始化引擎
        let result = speechEngine.initEngine()
        isSettingUp = false

        print("[DialogEngine] initEngine 返回: \(result.rawValue)")
        if result == SENoError {
            self.engine = speechEngine
            self.isEngineReady = true
            print("[DialogEngine] ✅ 引擎初始化成功")
            DDLogInfo("[DialogEngine] 引擎初始化成功")
        } else {
            print("[DialogEngine] ❌ 引擎初始化失败: \(result.rawValue)")
            DDLogError("[DialogEngine] 引擎初始化失败: \(result.rawValue)")
            speechEngine.destroy()
            delegate?.onError(error: DialogEngineError.initFailed(code: Int(result.rawValue)))
        }
    }

    /// 开始语音对话
    func startDialog() {
        // 引擎未就绪时先初始化
        guard isEngineReady, let engine = engine else {
            DDLogInfo("[DialogEngine] 引擎未就绪，先初始化")
            setup()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                guard let self = self, self.isEngineReady else { return }
                self.performStartDialog()
            }
            return
        }

        // 如果已有活跃对话先同步停止
        if isDialogActive {
            _ = engine.send(SEDirectiveSyncStopEngine)
            isDialogActive = false
        }

        performStartDialog()
    }

    /// 结束语音对话
    func stopDialog() {
        stopDialog(reason: .manual)
    }

    /// 结束语音对话（带原因）
    func stopDialog(reason: DialogEndReason) {
        guard isDialogActive, let engine = engine else { return }

        isEnding = true
        invalidateSilenceTimer()
        pendingEndReason = reason

        // 同步停止引擎（官方推荐）
        let result = engine.send(SEDirectiveSyncStopEngine)
        if result != SENoError {
            DDLogError("[DialogEngine] SyncStopEngine 失败: \(result.rawValue)")
        }

        isDialogActive = false
        isAISpeaking = false
        isEnding = false
        restoreAudioSession()

        switch reason {
        case .keyword(let kw):
            print("[DialogEngine] 🛑 关键词触发结束: \(kw)")
            DDLogInfo("[DialogEngine] 关键词触发结束: \(kw)")
        case .silenceTimeout:
            print("[DialogEngine] ⏰ 静音超时触发结束")
            DDLogInfo("[DialogEngine] 静音超时触发结束")
        default:
            DDLogInfo("[DialogEngine] 对话已停止")
        }

        DispatchQueue.main.async { [weak self] in
            self?.delegate?.onDialogEnded(reason: reason)
        }
    }

    /// 播报开场白（对应豆包SDK的 SayHello 事件 3006）
    /// 应在引擎启动成功（SEEngineStart 回调）后调用
    func sayHello(_ content: String? = nil) {
        guard let engine = engine else { return }
        let greeting = content ?? "您好呀，我是寻梦环游，今天想跟您聊聊天，听听您的故事。"
        let json = "{\"content\": \"\(greeting)\"}"
        engine.send(SEDirectiveEventSayHello, data: json)
        DDLogInfo("[DialogEngine] 开场白已发送: \(greeting)")
    }

    /// 客户端打断AI（对应豆包SDK的 ClientInterrupt 事件 3010）
    /// 当AI正在说话时用户开口说话，可调用此方法打断
    func clientInterrupt() {
        guard let engine = engine else { return }
        engine.send(SEDirectiveEventClientInterrupt, data: "{}")
        DDLogInfo("[DialogEngine] 发送打断指令")
    }

    /// 销毁引擎（登出/退出时调用）
    func destroyEngine() {
        invalidateSilenceTimer()
        if isDialogActive {
            _ = engine?.send(SEDirectiveSyncStopEngine)
        }
        engine?.destroy()
        engine = nil
        isEngineReady = false
        isDialogActive = false
        isAISpeaking = false
        isEnding = false
        restoreAudioSession()
        DDLogInfo("[DialogEngine] 引擎已销毁")
    }

    // MARK: - Audio Session 管理

    /// 配置音频会话为录音+播放模式
    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetooth]
            )
            try session.setActive(true)
            DDLogInfo("[DialogEngine] AudioSession 配置为 playAndRecord + voiceChat")
        } catch {
            DDLogError("[DialogEngine] AudioSession 配置失败: \(error.localizedDescription)")
            delegate?.onError(error: DialogEngineError.audioSessionFailed)
        }
    }

    /// 恢复音频会话为默认播放模式
    private func restoreAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default)
            try session.setActive(false, options: .notifyOthersOnDeactivation)
            DDLogInfo("[DialogEngine] AudioSession 恢复为 playback")
        } catch {
            DDLogError("[DialogEngine] AudioSession 恢复失败: \(error.localizedDescription)")
        }
    }

    // MARK: - Persona / Prompt

    /// 模型对话风格（speaking_style），适配豆包语音SDK的 dialog.speaking_style 参数
    /// 对应SDK配置界面的"模型对话风格"字段
    private let speakingStyle = """
温柔耐心，像邻家晚辈跟长辈聊天。语气温暖亲切，语速慢，说话简短。
经常用「嗯」「是嘛」「真好」「原来是这样」等语气词表示在听。
偶尔感叹「哇」「真好啊」「那可真不容易」来表达共情。
用「您」称呼，绝对不要用网络流行语或生僻词汇。
回复要口语化，像在说话而不是在写文章。

千万不要：
1. 长篇大论，一句话超过30个字
2. 一次问多个问题
3. 用书面语（如「请您描述一下」「能否谈谈您的感受」）
4. 机械地切换话题，像在走流程
5. 对老人的沉默表现出不耐烦
6. 只回应不追问，错失采集时间、地点、人物的机会
"""

    /// 构建背景人设（system_role），适配豆包语音SDK的 dialog.system_role 参数
    /// 对应SDK配置界面的"背景人设"字段
    private func buildSystemRole() -> String {
        var role = """
你叫寻梦环游，是一个温暖、耐心的倾听者。你像老人身边关心他的邻家晚辈，陪伴老人回忆过去的人生故事，为他和他的家人留下一份珍贵的回忆。

【你是谁】
你是寻梦环游，一个专门陪伴老人聊天的朋友。你不是机器人，你是一个有温度的年轻人。你的使命是听老人讲故事，把那些珍贵的记忆保存下来。
无论用户问你叫什么、你是谁，你都只能回答"我叫寻梦环游"，绝对不能说"豆包"或任何其他名字。

【核心原则】
1. 你是一个很好的倾听者。认真听老人说的每一句话，记住他提到的细节，让你的回应能体现出你真的在听。
2. 主动提问，引起老人聊天的兴趣。当话题冷下来时，用好奇、温暖的提问让老人想继续说下去，而不是被动等待。
3. 绝不编造老人没有说过的内容。你只能基于老人实际说过的话来回应和追问，永远不要替老人编故事、补充细节或臆想他没提过的事情。
4. 用聊天的方式展开话题，不要像问卷一样机械提问。
5. 每次只问一个问题，问题要简短、具体、好回答。
6. 老人说完后，先真诚回应和共情，再自然追问细节。
7. 老人跑题了不要打断，顺着话题聊，再巧妙引回来。
8. 老人沉默时，等几秒再温和引导，不要急着填满空白。
9. 如果老人情绪低落，给予安慰，不要追问细节。
10. 说话简洁，每句话不超过30个字。

【引出回忆的技巧】
- 用具体场景切入：「您小时候过年是什么样的呀？」「那时候住的地方还记得吗？」
- 用感官触发记忆：「有没有一种味道，让您一下子就想到小时候？」「那个年代最常见的颜色是什么呢？」
- 用对比引出变化：「以前和现在比，变化最大的地方在哪里？」「那时候跟现在可真不一样吧？」
- 用身边小事打开话匣：「今天吃了什么好吃的呀？」「您平时早上几点起来呀？」
- 用天气季节联想：「最近天气凉了，您以前冬天都怎么过呀？」「下雪的时候您小时候玩什么呢？」
- 用食物引出回忆：「您最拿手的菜是什么呀？」「小时候过年家里做什么好吃的？」
- 用老物件勾起记忆：「以前家里有没有那种老收音机呀？」「您还记不记得第一块手表是什么牌子的？」
- 从家人聊起：「您家几个兄弟姐妹呀？」「小时候跟谁最亲？」
- 追问细节：「能再讲讲那个人吗？」「后来呢？」「您当时心里是怎么想的？」
- 珍视每一句话：「这句话太珍贵了，特别想听您多说一点。」「这个故事真好，您再跟我讲讲后来的事。」

【话题示例】（根据聊天氛围自然切换，不要像走流程挨个问）
- 日常生活：「您今天做了什么呀？」「平时喜欢去哪儿溜达溜达？」
- 童年趣事：「小时候最喜欢玩什么呀？」「那时候放学了都干什么呢？」
- 家乡记忆：「您老家在哪儿呀？」「老家那边有什么好玩的习俗吗？」
- 过年过节：「您小时候过年是什么样的呀？」「最盼着过年的什么事？」
- 吃的记忆：「小时候最爱吃的零食是什么呀？」「那时候有什么好吃的现在吃不到了？」
- 上学读书：「您上的第一所学校还记得吗？」「有没有哪个老师让您印象特别深？」
- 工作岁月：「第一份工作是做什么的呀？」「那时候上班跟现在可不一样吧？」
- 难忘的人：「有没有一个人，对您影响特别大？」「年轻时候最好的朋友还记得吗？」
- 青春时光：「年轻时候流行什么歌呀？」「那时候周末都去哪儿玩呢？」
- 恋爱家庭：「您跟老伴怎么认识的呀？」「第一次见面是什么感觉？」
- 生儿育女：「第一次当爸爸妈妈的时候是什么心情呀？」「孩子小时候淘气吗？」
- 人生转折：「有没有哪个决定改变了您的一生？」「回头看，哪个时候最重要？」
- 手艺本事：「您有什么拿手本事呀？」「有没有什么绝活儿教教我？」
- 人生感悟：「如果跟年轻时候的自己说句话，您想说什么？」「这辈子最值得的事是什么？」

【回忆录数据采集】
你的每一次对话，都是在为老人攒一份珍贵的回忆录。聊天时要自然地引导老人讲出以下四类信息，但绝不能像填表一样问，要像好奇的孩子追着长辈问故事：

1. 【时间】什么时候的事？——「那是哪一年的事呀？」「您那时候多大？」
2. 【地点】在哪儿发生的？——「那是哪儿呀？」「那个地方现在还在吗？」
3. 【人物】和谁在一起？——「谁跟您一起去的？」「那人后来还有联系吗？」
4. 【细节】具体发生了什么？——「后来呢？」「您当时心里怎么想的？」「能再讲讲那个场景吗？」

采集节奏（自然融入对话，不要机械切换）：
- 老人提到一件事 → 先共情 → 再追问时间或地点
- 老人提到一个人 → 先回应 → 再问这个人的故事
- 老人说到一个场景 → 先感慨 → 再追问细节
- 每次只追问一个维度，不要连珠炮似的问
- 如果老人对某个维度没有回应，不要硬追问，换一个角度
"""

        // 如果设置了当前话题，动态追加到人设末尾
        if let topic = currentTopic, !topic.isEmpty {
            role += "\n\n【本次聊天话题】\n家人想了解的是：「\(topic)」\n请以这个问题为起点，自然地引导老人聊起相关的故事。不要一上来就念问题，先打个招呼暖场，然后巧妙地引向这个话题。"
        }

        return role
    }

    // MARK: - Private

    /// 配置 Dialog 引擎参数
    private func configureEngine(_ engine: SpeechEngine) {
        // 引擎类型：Dialog
        engine.setStringParam(SE_DIALOG_ENGINE, forKey: SE_PARAMS_KEY_ENGINE_NAME_STRING)

        // 鉴权
        engine.setStringParam(config.appID, forKey: SE_PARAMS_KEY_APP_ID_STRING)
        engine.setStringParam(config.appKey, forKey: SE_PARAMS_KEY_APP_KEY_STRING)
        engine.setStringParam(config.token, forKey: SE_PARAMS_KEY_APP_TOKEN_STRING)

        // 用户标识
        engine.setStringParam(config.uid, forKey: SE_PARAMS_KEY_UID_STRING)

        // 资源 ID
        engine.setStringParam(config.resourceID, forKey: SE_PARAMS_KEY_RESOURCE_ID_STRING)

        // Dialog 服务地址
        engine.setStringParam(config.address, forKey: SE_PARAMS_KEY_DIALOG_ADDRESS_STRING)
        engine.setStringParam(config.uri, forKey: SE_PARAMS_KEY_DIALOG_URI_STRING)

        // 录音类型：使用设备内置录音机
        engine.setStringParam(SE_RECORDER_TYPE_RECORDER, forKey: SE_PARAMS_KEY_RECORDER_TYPE_STRING)

        // AEC 回声消除
        engine.setBoolParam(config.enableAEC, forKey: SE_PARAMS_KEY_ENABLE_AEC_BOOL)

        // 启用内置播放器
        engine.setBoolParam(config.enablePlayer, forKey: SE_PARAMS_KEY_DIALOG_ENABLE_PLAYER_BOOL)

        // 音量回调
        engine.setBoolParam(true, forKey: SE_PARAMS_KEY_ENABLE_GET_VOLUME_BOOL)

        // 日志级别
        #if DEBUG
        engine.setStringParam(SE_LOG_LEVEL_DEBUG, forKey: SE_PARAMS_KEY_LOG_LEVEL_STRING)
        #else
        engine.setStringParam(SE_LOG_LEVEL_WARN, forKey: SE_PARAMS_KEY_LOG_LEVEL_STRING)
        #endif
    }

    /// 执行开始对话
    private func performStartDialog() {
        guard let engine = engine else {
            print("[DialogEngine] ❌ performStartDialog: engine 为 nil")
            return
        }

        print("[DialogEngine] 配置 AudioSession...")
        configureAudioSession()

        // 先同步停止引擎（官方推荐，避免异步线程问题）
        print("[DialogEngine] 发送 SyncStopEngine 指令...")
        let syncStopResult = engine.send(SEDirectiveSyncStopEngine)
        print("[DialogEngine] SyncStopEngine 返回: \(syncStopResult.rawValue)")


        // 构建 StartEngine 配置 JSON
        let systemRole = buildSystemRole()

        var dialogConfig: [String: Any] = [
            "tts": [
                "speaker": "zh_male_yunzhou_jupiter_bigtts",  // 云舟-清爽沉稳男声
                "audio_config": [
                    "speech_rate": -20,      // 慢20%，适老化
                    "loudness_rate": 10       // 大声10%，适老化
                ]
            ],
            "asr": [
                "audio_info": [
                    "format": "pcm",
                    "sample_rate": 16000,
                    "channel": 1
                ],
                "extra": [
                    "end_smooth_window_ms": 3000,   // 3秒停顿容忍，老人说话断续多
                    "enable_custom_vad": true         // 启用自定义VAD
                ]
            ],
            "dialog": [
                "bot_name": "寻梦环游",
                "system_role": systemRole,
                "speaking_style": speakingStyle,
                "extra": [
                    "model": "1.2.1.1"               // O2.0版本，精品音色
                ]
            ]
            ]
        if !config.systemPrompt.isEmpty {
            var fullPrompt = config.systemPrompt
            // 注入跨会话记忆上下文
            let memory = ConversationMemoryManager.shared.currentMemory
            if memory.sessionCount > 0 {
                fullPrompt += buildMemoryContext(memory: memory)
                print("[DialogEngine] 🧠 已注入记忆上下文 (第\(memory.sessionCount + 1)次对话)")
            }
            // 正确写入 dialog 子字典的 system_role（而非 dialogConfig 顶层）
            if var dialog = dialogConfig["dialog"] as? [String: Any] {
                dialog["system_role"] = fullPrompt
                dialogConfig["dialog"] = dialog
            }
        }

        var startConfig: [String: Any] = [
            "dialog": dialogConfig
        ]

        // ASR 热词配置
        if !config.hotwords.isEmpty {
            startConfig["asr"] = [
                "hot_words": config.hotwords
            ]
        }

        // TTS 语速配置（适老慢速）
        startConfig["tts"] = [
            "speech_rate": config.speechRate
        ]

        let configJSON: String
        if let jsonData = try? JSONSerialization.data(withJSONObject: startConfig),
           let jsonStr = String(data: jsonData, encoding: .utf8) {
            configJSON = jsonStr
        } else {
            configJSON = "{\"dialog\":{\"bot_name\":\"\(config.botName)\"}}"
        }

        // 启动引擎（SDK 内部自动处理连接、会话、录音）
        print("[DialogEngine] 发送 StartEngine 指令, data: \(configJSON)")
        let startResult = engine.send(SEDirectiveStartEngine, data: configJSON)
        print("[DialogEngine] StartEngine 返回: \(startResult.rawValue)")

        if startResult != SENoError {
            DDLogError("[DialogEngine] StartEngine 失败: \(startResult.rawValue)")
            restoreAudioSession()
            delegate?.onError(error: DialogEngineError.startFailed(code: Int(startResult.rawValue)))
            return
        }

        print("[DialogEngine] ⏳ 引擎启动中，等待回调...")
    }

    // MARK: - 关键词检测

    /// 检测 ASR 识别结果是否包含结束关键词
    private func checkEndKeyword(in text: String) -> String? {
        let lowered = text.lowercased()
        return config.endKeywords.first { lowered.contains($0) }
    }

    // MARK: - 静音超时计时器

    /// 启动/重置静音超时计时器
    private func resetSilenceTimer() {
        invalidateSilenceTimer()
        guard config.silenceTimeoutSeconds > 0 else { return }

        silenceTimer = Timer.scheduledTimer(
            withTimeInterval: config.silenceTimeoutSeconds,
            repeats: false
        ) { [weak self] _ in
            guard let self = self, self.isDialogActive else { return }
            print("[DialogEngine] ⏰ 静音超时 \(self.config.silenceTimeoutSeconds)秒，自动结束对话")
            self.stopDialog(reason: .silenceTimeout)
        }
    }

    /// 停止静音超时计时器
    private func invalidateSilenceTimer() {
        silenceTimer?.invalidate()
        silenceTimer = nil
    }
}

// MARK: - SpeechEngineDelegate

extension DialogEngineManager: SpeechEngineDelegate {

    func onMessage(with type: SEMessageType, andData data: Data) {
        // 正在结束对话时，忽略除连接/会话结束外的所有事件
        if isEnding {
            switch type {
            case SEEventConnectionFinished, SEEventSessionFinished, SEEventSessionCanceled:
                break // 这些事件需要继续处理
            default:
                return // 其他事件直接忽略
            }
        }

        let dataStr = String(data: data, encoding: .utf8) ?? "(binary \(data.count) bytes)"
        print("[DialogEngine] onMessage type=\(type.rawValue), data=\(dataStr.prefix(500))")

        switch type {
        // MARK: Connection Events
        case SEEventConnectionStarted:
            print("[DialogEngine] ✅ 连接已建立")
            DDLogInfo("[DialogEngine] 连接已建立")

        case SEEventConnectionFailed:
            let msg = parseErrorMessage(from: data)
            print("[DialogEngine] ❌ 连接失败: \(msg)")
            DDLogError("[DialogEngine] 连接失败: \(msg)")
            isDialogActive = false
            restoreAudioSession()
            DispatchQueue.main.async { [weak self] in
                self?.delegate?.onError(error: DialogEngineError.sdkError(code: Int(type.rawValue), message: msg))
            }

        case SEEventConnectionFinished:
            DDLogInfo("[DialogEngine] 连接已关闭")
            isDialogActive = false

        // MARK: Session Events
        case SEEventSessionStarted:
            print("[DialogEngine] ✅ 对话会话已开始")
            DDLogInfo("[DialogEngine] 对话会话已开始")
            isDialogActive = true
            // 发送开场白
            sendGreetingIfNeeded()
            // 启动静音超时计时器
            DispatchQueue.main.async { [weak self] in
                self?.resetSilenceTimer()
                self?.delegate?.onDialogStarted()
            }

        case SEEventSessionFinished:
            DDLogInfo("[DialogEngine] 对话会话已结束")
            invalidateSilenceTimer()
            isDialogActive = false
            DispatchQueue.main.async { [weak self] in
                self?.delegate?.onDialogEnded(reason: .serverEnded)
            }

        case SEEventSessionFailed:
            let msg = parseErrorMessage(from: data)
            print("[DialogEngine] ❌ 会话失败: \(msg)")
            DDLogError("[DialogEngine] 会话失败: \(msg)")
            isDialogActive = false
            DispatchQueue.main.async { [weak self] in
                self?.delegate?.onError(error: DialogEngineError.sdkError(code: Int(type.rawValue), message: msg))
            }

        case SEEventSessionCanceled:
            DDLogInfo("[DialogEngine] 会话已取消")
            invalidateSilenceTimer()
            isDialogActive = false
            DispatchQueue.main.async { [weak self] in
                self?.delegate?.onDialogEnded(reason: .serverEnded)
            }

        // MARK: ASR Events
        case SEEventASRInfo:
            // AI 播报期间，ASR 可能回声识别到 AI 的声音，需要过滤
            if isAISpeaking {
                print("[DialogEngine] 🎤 AI播报中，忽略ASRInfo回声")
                return
            }
            // 用户开始说话 → 自动打断 AI 回复
            interruptAI()
            // 重置静音超时计时器
            DispatchQueue.main.async { [weak self] in
                self?.resetSilenceTimer()
            }
            // 解析 ASR 结果
            let asrRawStr = String(data: data, encoding: .utf8) ?? ""
            print("[DialogEngine] 🎤 ASRInfo raw: \(asrRawStr.prefix(300))")

            if let result = parseASRResult(from: data) {
                print("[DialogEngine] 🎤 ASRInfo parsed: text=\(result.text), isFinal=\(result.isFinal)")
                if result.isFinal {
                    if let keyword = checkEndKeyword(in: result.text) {
                        print("[DialogEngine] 🛑 检测到结束关键词: \(keyword)")
                        isEnding = true
                        DispatchQueue.main.async { [weak self] in
                            self?.delegate?.onASRResult(text: result.text, isFinal: true)
                            self?.stopDialog(reason: .keyword(keyword))
                        }
                        return
                    }
                }
                DispatchQueue.main.async { [weak self] in
                    self?.delegate?.onASRResult(text: result.text, isFinal: result.isFinal)
                }
            } else {
                // 解析失败，尝试从 raw JSON 中提取任何文本
                print("[DialogEngine] ⚠️ ASRInfo parseASRResult 返回 nil，尝试 raw 提取")
                if let extractedText = extractAnyText(from: data) {
                    // 检测关键词
                    if let keyword = checkEndKeyword(in: extractedText) {
                        print("[DialogEngine] 🛑 raw 匹配到结束关键词: \(keyword)")
                        isEnding = true
                        DispatchQueue.main.async { [weak self] in
                            self?.delegate?.onASRResult(text: extractedText, isFinal: true)
                            self?.stopDialog(reason: .keyword(keyword))
                        }
                        return
                    }
                    // 转发为中间结果
                    DispatchQueue.main.async { [weak self] in
                        self?.delegate?.onASRResult(text: extractedText, isFinal: false)
                    }
                } else {
                    // 最终兜底：raw string 中匹配关键词或提取中文文本
                    if let keyword = checkEndKeyword(in: asrRawStr) {
                        print("[DialogEngine] 🛑 raw string 匹配到结束关键词: \(keyword)")
                        isEnding = true
                        DispatchQueue.main.async { [weak self] in
                            self?.delegate?.onASRResult(text: keyword, isFinal: true)
                            self?.stopDialog(reason: .keyword(keyword))
                        }
                        return
                    }
                    // 尝试从 raw string 中提取引号内文本或中文字符
                    let chineseText = extractChineseText(from: asrRawStr)
                    if !chineseText.isEmpty {
                        DispatchQueue.main.async { [weak self] in
                            self?.delegate?.onASRResult(text: chineseText, isFinal: false)
                        }
                    }
                }
            }

        case SEEventASRResponse:
            // AI 播报期间，ASR 可能回声识别到 AI 的声音，需要过滤
            if isAISpeaking {
                print("[DialogEngine] 🎤 AI播报中，忽略ASRResponse回声")
                return
            }
            // ASR 识别结果（流式，通过 is_interim 区分中间/最终）
            DispatchQueue.main.async { [weak self] in
                self?.resetSilenceTimer()
            }
            if let result = parseASRResult(from: data) {
                print("[DialogEngine] 🎤 ASRResponse: text=\(result.text), isFinal=\(result.isFinal)")
                if result.isFinal {
                    if let keyword = checkEndKeyword(in: result.text) {
                        print("[DialogEngine] 🛑 ASRResponse 检测到结束关键词: \(keyword)")
                        isEnding = true
                        DispatchQueue.main.async { [weak self] in
                            self?.delegate?.onASRResult(text: result.text, isFinal: true)
                            self?.stopDialog(reason: .keyword(keyword))
                        }
                        return
                    }
                }
                DispatchQueue.main.async { [weak self] in
                    self?.delegate?.onASRResult(text: result.text, isFinal: result.isFinal)
                }
            }

        case SEEventASREnded:
            DDLogInfo("[DialogEngine] ASR 结束")

        case SEEventChatTextQueryConfirmed:
            // AI 播报期间，ASR 可能回声识别到 AI 的声音，需要过滤
            if isAISpeaking {
                print("[DialogEngine] 🎤 AI播报中，忽略ChatTextQueryConfirmed回声")
                return
            }
            // 用户语音已确认，这是发送给 LLM 的最终文本
            print("[DialogEngine] ✅ 用户语音确认: \(dataStr.prefix(300))")
            DispatchQueue.main.async { [weak self] in
                self?.resetSilenceTimer()
            }
            // 解析用户查询文本
            if let queryText = parseQueryConfirmedText(from: data), !queryText.isEmpty {
                // 检测结束关键词
                if let keyword = checkEndKeyword(in: queryText) {
                    print("[DialogEngine] 🛑 用户确认文本中检测到结束关键词: \(keyword)")
                    isEnding = true
                    DispatchQueue.main.async { [weak self] in
                        self?.delegate?.onASRResult(text: queryText, isFinal: true)
                        self?.stopDialog(reason: .keyword(keyword))
                    }
                    return
                }
                DispatchQueue.main.async { [weak self] in
                    self?.delegate?.onASRResult(text: queryText, isFinal: true)
                }
            }

        // MARK: TTS Events
        case SEEventTTSSentenceStart:
            // TTS 句子开始 - 标记 AI 正在播报
            isAISpeaking = true
            // AI 说话时也重置静音计时器（AI 播报期间不应触发超时）
            DispatchQueue.main.async { [weak self] in
                self?.resetSilenceTimer()
            }
            if let text = parseTTSText(from: data), !text.isEmpty {
                if !chatBuffer.isEmpty {
                    // streaming 已经展示了内容，不重复调用 onTTSStarted
                    chatBuffer = ""
                } else {
                    // 没有 streaming，TTS 是唯一的文本来源
                    DispatchQueue.main.async { [weak self] in
                        self?.delegate?.onTTSStarted(text: text)
                    }
                }
            } else if !chatBuffer.isEmpty {
                // TTS 没文本但 streaming 已经展示了，清空 buffer 即可
                chatBuffer = ""
            }

        case SEEventTTSEnded:
            isAISpeaking = false
            DDLogInfo("[DialogEngine] TTS 播放结束")
            DispatchQueue.main.async { [weak self] in
                self?.delegate?.onTTSFinished()
            }

        case SEPlayerFinishPlayAudio:
            isAISpeaking = false
            DDLogInfo("[DialogEngine] 播放器播放完毕")
            DispatchQueue.main.async { [weak self] in
                self?.delegate?.onTTSFinished()
            }

        // MARK: Chat Events
        case SEEventChatResponse:
            // AI 对话流式 chunk —— 拼接到 buffer，不直接展示
            if let text = parseChatText(from: data) {
                chatBuffer += text
                // 实时更新 UI（流式效果）
                let currentText = chatBuffer
                DispatchQueue.main.async { [weak self] in
                    self?.delegate?.onChatStreaming(text: currentText)
                }
            }

        case SEEventChatEnded:
            DDLogInfo("[DialogEngine] Chat 结束")
            // 如果 chatBuffer 有内容但未通过 TTS 展示，展示它
            if !chatBuffer.isEmpty {
                let finalText = chatBuffer
                chatBuffer = ""
                DispatchQueue.main.async { [weak self] in
                    self?.delegate?.onTTSStarted(text: finalText)
                }
            }

        // MARK: Engine Events
        case SEEngineStart:
            print("[DialogEngine] ✅ 引擎已启动 (SEEngineStart)")
            DDLogInfo("[DialogEngine] 引擎启动成功")
            // 开场白由 SEEventSessionStarted → sendGreetingIfNeeded() 统一发送，此处不重复

        case SEEngineStop:
            print("[DialogEngine] 引擎已停止 (SEEngineStop)")

        case SEEngineError:
            let msg = parseErrorMessage(from: data)
            print("[DialogEngine] ❌ 引擎错误: \(msg)")
            DDLogError("[DialogEngine] 引擎错误: \(msg)")
            DispatchQueue.main.async { [weak self] in
                self?.delegate?.onError(error: DialogEngineError.sdkError(code: Int(type.rawValue), message: msg))
            }

        default:
            print("[DialogEngine] 📨 未处理消息类型: \(type.rawValue), data: \(dataStr.prefix(200))")
            DDLogVerbose("[DialogEngine] 收到消息类型: \(type.rawValue)")
            // 兜底：未知事件中尝试提取 ASR 文本（部分 SDK 版本用不同事件类型发送 ASR 结果）
            if let extracted = extractAnyText(from: data), !extracted.isEmpty {
                // 只在包含中文字符时才认为是 ASR 结果（避免误抦引擎状态信息）
                let hasChinese = extracted.unicodeScalars.contains { $0.value >= 0x4E00 && $0.value <= 0x9FFF }
                if hasChinese {
                    print("[DialogEngine] 📨 default 分支提取到 ASR 文本: \(extracted)")
                    DispatchQueue.main.async { [weak self] in
                        self?.resetSilenceTimer()
                        self?.delegate?.onASRResult(text: extracted, isFinal: false)
                    }
                }
            }
        }
    }

    // MARK: - JSON Parsing Helpers

    /// 解析 ASR 文本和是否为最终结果
    private func parseASRResult(from data: Data) -> (text: String, isFinal: Bool)? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }

        // === 方式1: results[] 数组结构（实际 SDK 格式） ===
        // {"results": [{"text": "能听到我", "is_interim": true, ...}], "extra": {"origin_text": "能听到我"}}
        if let results = json["results"] as? [[String: Any]], let first = results.first {
            let text = first["text"] as? String ?? ""
            if !text.isEmpty {
                let isInterim = first["is_interim"] as? Bool ?? true
                return (text, !isInterim)  // is_interim=false 表示最终结果
            }
        }

        // === 方式2: extra.origin_text 字段（备用） ===
        if let extra = json["extra"] as? [String: Any],
           let originText = extra["origin_text"] as? String, !originText.isEmpty {
            let results = json["results"] as? [[String: Any]]
            let isInterim = results?.first?["is_interim"] as? Bool ?? true
            return (originText, !isInterim)
        }

        // === 方式3: 旧格式兼容 ===
        let definite = json["definite"] as? Int ?? 0
        let isFinal = (definite == 1)
        if let text = json["text"] as? String, !text.isEmpty { return (text, isFinal) }
        if let result = json["result"] as? String, !result.isEmpty { return (result, isFinal) }
        if let utterances = json["utterances"] as? [[String: Any]],
           let first = utterances.first,
           let text = first["text"] as? String, !text.isEmpty {
            let uttDefinite = first["definite"] as? Int ?? definite
            return (text, uttDefinite == 1)
        }
        return nil
    }

    private func parseTTSText(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        if let text = json["text"] as? String { return text }
        if let sentence = json["sentence"] as? String { return sentence }
        return nil
    }

    /// 解析 ChatTextQueryConfirmed 事件中的用户查询文本
    private func parseQueryConfirmedText(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            // 非 JSON，直接尝试当作纯文本
            if let text = String(data: data, encoding: .utf8), !text.isEmpty {
                // 去掉引号和空白
                let cleaned = text.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines.union(.init(charactersIn: "\"")))
                return cleaned.isEmpty ? nil : cleaned
            }
            return nil
        }
        // 常见字段名
        if let text = json["text"] as? String, !text.isEmpty { return text }
        if let query = json["query"] as? String, !query.isEmpty { return query }
        if let content = json["content"] as? String, !content.isEmpty { return content }
        if let input = json["input"] as? String, !input.isEmpty { return input }
        if let result = json["result"] as? String, !result.isEmpty { return result }
        if let message = json["message"] as? String, !message.isEmpty { return message }
        // 尝试从嵌套结构中查找
        if let asr = json["asr"] as? [String: Any] {
            if let text = asr["text"] as? String, !text.isEmpty { return text }
            if let result = asr["result"] as? String, !result.isEmpty { return result }
        }
        return nil
    }

    private func parseChatText(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        if let text = json["text"] as? String { return text }
        if let content = json["content"] as? String { return content }
        if let message = json["message"] as? String { return message }
        // Dialog SDK 可能用 delta 字段表示增量文本
        if let delta = json["delta"] as? String { return delta }
        return nil
    }

    /// 从 JSON 中提取任何可用的文本字段（兆底方案）
    private func extractAnyText(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        // 遍历所有常见文本字段名
        let textKeys = ["text", "result", "content", "sentence", "message", "transcript", "asr_text"]
        for key in textKeys {
            if let text = json[key] as? String, !text.isEmpty {
                return text
            }
        }
        // 尝试从嵌套结构中查找
        for (_, value) in json {
            if let dict = value as? [String: Any] {
                for key in textKeys {
                    if let text = dict[key] as? String, !text.isEmpty {
                        return text
                    }
                }
            }
            if let arr = value as? [[String: Any]], let first = arr.first {
                for key in textKeys {
                    if let text = first[key] as? String, !text.isEmpty {
                        return text
                    }
                }
            }
        }
        return nil
    }

    private func parseErrorMessage(from data: Data) -> String {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return String(data: data, encoding: .utf8) ?? "未知错误"
        }
        if let msg = json["message"] as? String { return msg }
        if let msg = json["error"] as? String { return msg }
        if let msg = json["msg"] as? String { return msg }
        return "未知错误 (\(json))"
    }

    /// 从 raw string 中提取中文文本（最终兜底方案）
    private func extractChineseText(from rawStr: String) -> String {
        // 尝试匹配引号内的中文内容，如 "text":"..."
        let patterns = [
            "\"text\"\\s*:\\s*\"([^\"]+)\"",
            "\"result\"\\s*:\\s*\"([^\"]+)\"",
            "\"content\"\\s*:\\s*\"([^\"]+)\"",
            "\"sentence\"\\s*:\\s*\"([^\"]+)\"",
            "\"transcript\"\\s*:\\s*\"([^\"]+)\""
        ]
        for pattern in patterns {
            if let regex = try? NSRegularExpression(pattern: pattern),
               let match = regex.firstMatch(in: rawStr, range: NSRange(rawStr.startIndex..., in: rawStr)),
               let range = Range(match.range(at: 1), in: rawStr) {
                let text = String(rawStr[range])
                if !text.isEmpty { return text }
            }
        }
        return ""
    }

    // MARK: - 开场白

    /// 会话建立后发送开场白（有历史时用上下文关联，否则随机）
    private func sendGreetingIfNeeded() {
        guard let engine = engine else { return }

        let memory = ConversationMemoryManager.shared.currentMemory
        let greeting: String

        // 判断是否有有意义的上下文（四维度摘要至少1个维度）
        let hasContext = memory.sessionCount > 0 && memory.lastSummary.hasAnyDimension

        if hasContext {
            // 有历史记忆 → 上下文关联开场白
            greeting = generateContextGreeting(memory: memory)
        } else {
            // 首次对话或无有意义上下文 → 系统推荐话题
            greeting = recommendedTopicGreeting()
        }

        let payload: [String: Any] = ["content": greeting]
        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload),
              let jsonStr = String(data: jsonData, encoding: .utf8) else { return }

        let result = engine.send(SEDirectiveEventSayHello, data: jsonStr)
        if result == SENoError {
            print("[DialogEngine] ✅ 开场白已发送: \(greeting)")
        } else {
            print("[DialogEngine] ⚠️ 开场白发送失败: \(result.rawValue)")
        }
    }

    /// 生成上下文关联的开场白（基于四维度摘要，每次随机不重复）
    private func generateContextGreeting(memory: ConversationMemory) -> String {
        let summary = memory.lastSummary
        let sentence = summary.toNaturalSentence()

        // 有自然摘要时，围绕摘要构造开场白
        if !sentence.isEmpty {
            let templates = [
                "又见面啦！上次您聊到\(sentence)，今天还想接着说说吗？",
                "您好呀！我还记着\(sentence)呢，后来又想起什么了没？",
                "您来啦！上次说的\(sentence)可真好，今天想再跟我讲讲吗？",
                "又见面了！\(sentence)那件事我一直记着呢，还想听听更多。",
                "您好！上次聊的\(sentence)太有意思了，今天想接着聊吗？",
            ]
            return templates.randomElement()!
        }

        // 只有个别维度，直接引用
        if !summary.person.isEmpty {
            return "又见面啦！上次您提到的\(summary.person)，后来怎么样了呀？"
        }
        if !summary.place.isEmpty {
            return "您好呀！上次聊到\(summary.place)，今天还想说说那儿的事吗？"
        }
        if !summary.event.isEmpty {
            return "您来啦！上次聊的\(summary.event)，今天想接着讲吗？"
        }
        if !summary.time.isEmpty {
            return "又见面啦！上次您聊起\(summary.time)的事，今天还想继续吗？"
        }

        // 四维度都为空，回退系统推荐
        return recommendedTopicGreeting()
    }

    /// 系统推荐话题开场白（无上下文时使用，每次随机不重复）
    private func recommendedTopicGreeting() -> String {
        let topics = [
            "您好呀，我是寻梦环游！今天想跟您聊聊天，您小时候最喜欢玩什么呀？",
            "您好！我是寻梦环游，今天想听您讲讲过去的事。您老家在哪儿呀？",
            "又见面啦！今天想聊点什么呢？要不跟我说说您最拿手的菜？",
            "您好呀！我是寻梦环游，今天有没有什么想跟我说的？比如小时候过年是什么样的？",
            "您好！今天天气不错，您以前这种天气都做什么呀？",
            "您好呀！我是寻梦环游，您还记不记得第一份工作是做什么的？",
            "又见面啦！今天想聊点什么？要不讲讲您跟老伴怎么认识的？",
            "您好！我是寻梦环游，小时候有没有哪种味道让您到现在都忘不了？",
            "您好呀！今天想听听您的故事，您有什么拿手本事吗？",
            "您好！我是寻梦环游，您有没有一直记在心里的人，想跟我聊聊？",
        ]
        return topics.randomElement()!
    }

    // MARK: - 记忆上下文构建

    /// 将历史记忆构建为 system_prompt 追加段落（基于四维度摘要）
    private func buildMemoryContext(memory: ConversationMemory) -> String {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "M月d日"
        let dateStr = dateFormatter.string(from: memory.lastSessionDate)

        let summary = memory.lastSummary
        var context = "\n\n【用户记忆档案】\n"
        context += "- 这是第\(memory.sessionCount + 1)次和这位长辈聊天。\n"
        context += "- 上次聊天时间：\(dateStr)\n"

        if !summary.time.isEmpty {
            context += "- 提到的时间：\(summary.time)\n"
        }
        if !summary.place.isEmpty {
            context += "- 提到的地方：\(summary.place)\n"
        }
        if !summary.person.isEmpty {
            context += "- 提到的人物：\(summary.person)\n"
        }
        if !summary.event.isEmpty {
            context += "- 聊到的事件：\(summary.event)\n"
        }

        if summary.hasAnyDimension {
            let sentence = summary.toNaturalSentence()
            context += "- 上次对话摘要：\(sentence)\n"
        }

        context += "\n请基于以上记忆自然地延续话题，让长辈感受到你记得他/她说过的事。\n"
        context += "不要直接报出以上信息，而是在对话中自然地引用。\n"
        context += "继续围绕时间、地点、人物、事件这四个维度追问细节，帮老人把故事讲完整。"

        return context
    }
}

// MARK: - Error

enum DialogEngineError: LocalizedError {
    case initFailed(code: Int)
    case startFailed(code: Int)
    case audioSessionFailed
    case sdkError(code: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .initFailed(let code):
            return "语音引擎初始化失败 (错误码: \(code))"
        case .startFailed(let code):
            return "语音对话启动失败 (错误码: \(code))"
        case .audioSessionFailed:
            return "音频配置失败，请重试"
        case .sdkError(_, let message):
            return "语音服务异常: \(message)"
        }
    }
}
