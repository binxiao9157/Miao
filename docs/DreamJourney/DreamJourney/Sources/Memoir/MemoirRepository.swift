import Foundation
import CocoaLumberjack

// MARK: - 回忆录本地持久化（文件系统）
final class MemoirRepository {

    static let shared = MemoirRepository()

    // MARK: - Properties

    /// 内存缓存
    private var memoirs: [MemoirModel] = []

    /// 存储目录
    private let storageDirectory: URL

    // MARK: - Init

    private init() {
        // Application Support/memoirs/
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        storageDirectory = appSupport.appendingPathComponent("memoirs", isDirectory: true)

        // 确保目录存在
        try? FileManager.default.createDirectory(at: storageDirectory, withIntermediateDirectories: true)

        // 从文件加载
        loadAllFromDisk()

        // 首次使用时写入 mock 数据
        if memoirs.isEmpty {
            seedMockData()
        }
    }

    // MARK: - Public API

    func getAll() -> [MemoirModel] {
        return memoirs.sorted { $0.createdAt > $1.createdAt }
    }

    func get(by id: String) -> MemoirModel? {
        return memoirs.first { $0.id == id }
    }

    func save(_ memoir: MemoirModel) {
        // 更新或新增
        let isNew: Bool
        if let index = memoirs.firstIndex(where: { $0.id == memoir.id }) {
            memoirs[index] = memoir
            isNew = false
        } else {
            memoirs.insert(memoir, at: 0)
            isNew = true
        }
        // 持久化到文件
        saveToDisk(memoir)

        DDLogInfo("[MemoirSync] save memoir: id=\(memoir.id), isNew=\(isNew), title=\(memoir.title), location=\(memoir.location), year=\(memoir.year), month=\(memoir.month), lat=\(memoir.latitude), lng=\(memoir.longitude), authorId=\(memoir.authorId)")

        // 只有新建时才发"新回忆录生成"通知（更新音频/编辑内容不发）
        // 同时同步生成一条二Tab足迹回忆标签（NEW 卡片）
        if isNew {
            NotificationCenter.default.post(name: .djNewMemoirGenerated, object: memoir)
            syncToMemoryRepository(memoir)
        }
    }

    // MARK: - 一Tab → 二Tab 桥接
    /// 新生成的回忆录 → 生成一条 MemoryModel 加入 MemoryRepository，
    /// 触发二Tab 足迹页地图标注刷新，并以 NEW 标签卡片形式呈现。
    /// id 复用 memoir.id，确保同一回忆录不会重复同步。
    private func syncToMemoryRepository(_ memoir: MemoirModel) {
        // 已存在则跳过（兜底防重复）
        if MemoryRepository.shared.get(by: memoir.id) != nil {
            DDLogInfo("[MemoirSync] skip sync — memory id=\(memoir.id) already exists")
            return
        }

        // 副标题：取散文首句或前 30 字符
        let subtitle: String = {
            let prose = memoir.prose.replacingOccurrences(of: "\n", with: " ")
            if let endIdx = prose.firstIndex(where: { "。！？.!?".contains($0) }) {
                return String(prose[..<endIdx])
            }
            return String(prose.prefix(30))
        }()

        let memory = MemoryModel(
            id: memoir.id,
            title: "\(memoir.location) · \(memoir.year)年\(memoir.month)月",
            subtitle: subtitle,
            fullContent: memoir.prose,                   // 完整散文持久化进 MemoryRepository，详情页正文使用
            location: memoir.location,
            year: memoir.year,
            month: memoir.month,
            latitude: memoir.latitude,
            longitude: memoir.longitude,
            imageNames: [],
            audioName: memoir.sessionId,                  // sessionId 作为录音文件名，详情页可加载 recordings/{sessionId}.m4a
            isPrivate: memoir.isPrivate,
            authorId: memoir.authorId
        )
        DDLogInfo("[MemoirSync] bridging → MemoryRepository.add: memoryId=\(memory.id), title=\(memory.title), authorId=\(memory.authorId)")
        MemoryRepository.shared.add(memory)
    }

    func delete(id: String) {
        memoirs.removeAll { $0.id == id }
        deleteFromDisk(id: id)
        // 联动删除已合成的音频文件
        MemoirTTSService.shared.deleteAudio(for: id)
    }

    // MARK: - 录音管理

    /// 保存对话录音文件到录音目录
    /// - Parameters:
    ///   - sourceURL: 录音源文件 URL
    ///   - sessionId: 会话 ID
    func saveRecording(from sourceURL: URL, sessionId: String) -> URL? {
        let destURL = recordingsDirectory.appendingPathComponent("\(sessionId).m4a")
        do {
            // 如果目标已存在，先删除
            if FileManager.default.fileExists(atPath: destURL.path) {
                try FileManager.default.removeItem(at: destURL)
            }
            try FileManager.default.copyItem(at: sourceURL, to: destURL)
            DDLogInfo("[MemoirRepository] 录音已保存: \(destURL.path)")
            return destURL
        } catch {
            DDLogError("[MemoirRepository] 保存录音失败: \(error.localizedDescription)")
            return nil
        }
    }

    /// 获取录音文件 URL
    func getRecordingURL(sessionId: String) -> URL? {
        let url = recordingsDirectory.appendingPathComponent("\(sessionId).m4a")
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    /// 删除录音文件
    func deleteRecording(sessionId: String) {
        let url = recordingsDirectory.appendingPathComponent("\(sessionId).m4a")
        try? FileManager.default.removeItem(at: url)
    }

    /// 录音存储目录
    private var recordingsDirectory: URL {
        let dir = storageDirectory.appendingPathComponent("recordings", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    // MARK: - Disk I/O

    private func fileURL(for id: String) -> URL {
        return storageDirectory.appendingPathComponent("\(id).json")
    }

    private func loadAllFromDisk() {
        guard let files = try? FileManager.default.contentsOfDirectory(
            at: storageDirectory,
            includingPropertiesForKeys: nil,
            options: .skipsHiddenFiles
        ) else { return }

        for fileURL in files where fileURL.pathExtension == "json" {
            guard let data = try? Data(contentsOf: fileURL),
                  let memoir = try? JSONDecoder().decode(MemoirModel.self, from: data) else {
                continue
            }
            memoirs.append(memoir)
        }
    }

    private func saveToDisk(_ memoir: MemoirModel) {
        let encoder = JSONEncoder()
        encoder.outputFormatting = .prettyPrinted
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(memoir) else { return }
        try? data.write(to: fileURL(for: memoir.id), options: .atomic)
    }

    private func deleteFromDisk(id: String) {
        try? FileManager.default.removeItem(at: fileURL(for: id))
    }

    // MARK: - Mock 数据

    private func seedMockData() {
        let mockMemoirs: [MemoirModel] = [
            MemoirModel(
                title: "上海外滩的记忆",
                prose: "1975年的夏天，外滩的江风还带着些许咸涩的味道。那时候的外滩，不似今日这般灯火辉煌，却有着一种朴素而真挚的美。外公牵着外婆的手，在黄浦江畔留下了一张黑白照片。照片里，外公穿着那件洗得发白的蓝色工装，外婆则扎着两条麻花辫，笑得眼睛弯成了月牙。\n\n那天是外公外婆的结婚纪念日，一家人特意从老城厢走到了外滩。妈妈说，那是她童年里最开心的一天，因为外公难得休息，一家三口在江边走了很久很久。外婆回忆说，那天外公报了一个数字，说等将来上海会变得很不一样，他一定要带她看看未来的外滩。\n\n如今，外滩早已换了模样，而这张照片，成了全家人最珍贵的记忆。",
                timeDescription: "1975年7月",
                year: 1975, month: 7,
                location: "上海外滩",
                latitude: 31.2397, longitude: 121.4901,
                keyPeople: ["外公", "外婆", "妈妈"]
            ),
            MemoirModel(
                title: "北京故宫之行",
                prose: "1988年的秋天，爸爸第一次去北京出差。出发前，他在家里翻来覆去收拾行李，妈妈在旁边笑他，说又不是去见总统。可爸爸心里激动着呢——那可是北京，是他只在课本里见过的城市。\n\n到了北京，办完公务，爸爸特意请了半天假去故宫。他一个人走在红墙黄瓦之间，像个孩子一样东张西望。他在太和殿前站了很久，想着几百年前的皇帝就在这里上朝。他给妈妈买了一盒故宫的明信片，背面写道：「故宫真大，可惜你不能来看。等我挣够了钱，一定带你来。」\n\n那盒明信片，妈妈一直收在柜子里，一留就是三十多年。",
                timeDescription: "1988年10月",
                year: 1988, month: 10,
                location: "北京故宫",
                latitude: 39.9163, longitude: 116.3972,
                keyPeople: ["爸爸", "妈妈"]
            ),
            MemoirModel(
                title: "成都火锅的味道",
                prose: "2003年的五一假期，全家人第一次去了成都。那时候的宽窄巷子还没有现在这么热闹，但街边的小馆子已经飘满了火锅的香味。\n\n奶奶是地道的广东人，一辈子习惯了清淡的口味。可那天，在全家人的怂恿下，她第一次夹起了一块毛肚放进红油锅里。涮了七上八下之后，奶奶咬了一口——先是辣，然后是麻，最后是说不出的香。她的眼睛一下子就亮了，连说了三声「好吃！」，然后又要了一盘鹅肠。\n\n妈妈后来总爱讲这个故事，说那是奶奶这辈子吃得最豪放的一次。从那以后，每次全家聚会吃火锅，大家都会笑着提起成都那次，奶奶总是红着脸说：「那不一样嘛，那是在成都。」",
                timeDescription: "2003年5月",
                year: 2003, month: 5,
                location: "成都宽窄巷子",
                latitude: 30.6654, longitude: 104.0498,
                keyPeople: ["奶奶", "妈妈", "全家"]
            ),
        ]

        for memoir in mockMemoirs {
            memoirs.append(memoir)
            saveToDisk(memoir)
        }
    }
}

// MARK: - Notification

extension Notification.Name {
    /// 新回忆录生成完成
    static let djNewMemoirGenerated = Notification.Name("dj.memoir.newGenerated")
    /// 回忆录音频合成完成
    static let djMemoirAudioReady = Notification.Name("dj.memoir.audioReady")
    /// 对话已开始（录音服务监听）
    static let djDialogDidStart = Notification.Name("dj.dialog.didStart")
    /// 对话已停止（录音服务监听）
    static let djDialogDidStop = Notification.Name("dj.dialog.didStop")
}
