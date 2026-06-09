import UIKit
import AVFoundation
import CocoaLumberjack

// MARK: - 对话消息模型
enum TGMessage: Identifiable {
    case ai(text: String, timestamp: Date = Date())
    case user(text: String, timestamp: Date = Date())
    case photo(imagePath: String, timestamp: Date = Date())  // 用户发送的照片消息
    case privacyConfirmation

    var id: String { UUID().uuidString }
    var timestamp: Date {
        switch self {
        case .ai(_, let t), .user(_, let t), .photo(_, let t): return t
        case .privacyConfirmation: return Date()
        }
    }
}

// MARK: - 语音球状态
enum VoiceBallState {
    case idle         // 待机：脉冲动效，麦克风图标
    case active       // 对话中：波纹动效，停止图标
}

// MARK: - AIRecordingViewController：首页 AI 智能记录
final class AIRecordingViewController: UIViewController {

    // MARK: - UI：顶部标题
    private let titleLabel: UILabel = {
        let l = UILabel()
        l.text = "寻梦环游"
        l.font = .systemFont(ofSize: 28, weight: .bold)
        l.textColor = UIColor(red: 0.15, green: 0.12, blue: 0.10, alpha: 1.0)
        return l
    }()

    // MARK: - UI：消息流
    private lazy var messageTableView: UITableView = {
        let tv = UITableView(frame: .zero, style: .plain)
        tv.separatorStyle = .none
        tv.backgroundColor = .clear
        tv.register(TGMessageCell.self, forCellReuseIdentifier: "AIMessageCell")
        tv.register(TGMessageCell.self, forCellReuseIdentifier: "UserMessageCell")
        tv.register(TGPhotoCell.self, forCellReuseIdentifier: "PhotoCell")
        tv.register(TGPrivacyCell.self, forCellReuseIdentifier: "PrivacyCell")
        tv.tableHeaderView = UIView(frame: CGRect(x: 0, y: 0, width: 0, height: 8))
        tv.dataSource = self
        tv.delegate = self
        tv.keyboardDismissMode = .onDrag
        return tv
    }()

    // MARK: - UI：底部操作区
    private lazy var bottomContainer: UIView = {
        let v = UIView()
        v.backgroundColor = .warmBackground
        return v
    }()

    /// 底部容器底部约束（动态调整避开 TabBar）
    private var bottomContainerBottomConstraint: NSLayoutConstraint!

    /// 底部分割线（UI稿无分割线，隐藏）
    private let bottomDivider: UIView = {
        let v = UIView()
        v.backgroundColor = .clear
        return v
    }()

    /// 左侧辅助按鈕：相册
    private lazy var albumButton: UIButton = {
        let b = UIButton(type: .system)
        b.backgroundColor = UIColor(red: 0.87, green: 0.83, blue: 0.78, alpha: 0.55)
        b.layer.cornerRadius = 22
        b.layer.masksToBounds = true
        let config = UIImage.SymbolConfiguration(pointSize: 22, weight: .regular)
        let icon = UIImage(systemName: "photo", withConfiguration: config)
        b.setImage(icon, for: .normal)
        b.tintColor = UIColor(red: 0.40, green: 0.35, blue: 0.30, alpha: 1.0)
        b.addTarget(self, action: #selector(albumTapped), for: .touchUpInside)
        return b
    }()

    /// 右侧辅助按鈕：拍照
    private lazy var cameraButton: UIButton = {
        let b = UIButton(type: .system)
        b.backgroundColor = UIColor(red: 0.87, green: 0.83, blue: 0.78, alpha: 0.55)
        b.layer.cornerRadius = 22
        b.layer.masksToBounds = true
        let config = UIImage.SymbolConfiguration(pointSize: 22, weight: .regular)
        let icon = UIImage(systemName: "camera", withConfiguration: config)
        b.setImage(icon, for: .normal)
        b.tintColor = UIColor(red: 0.40, green: 0.35, blue: 0.30, alpha: 1.0)
        b.addTarget(self, action: #selector(cameraTapped), for: .touchUpInside)
        return b
    }()

    /// 中央语音球（橙色大圆 + 麦克风图标）
    private lazy var voiceBallButton: UIButton = {
        let b = UIButton(type: .custom)
        b.layer.cornerRadius = 40
        b.layer.masksToBounds = false
        b.backgroundColor = UIColor(red: 0.93, green: 0.58, blue: 0.22, alpha: 1.0)
        // 外圆光晕
        b.layer.shadowColor = UIColor(red: 0.93, green: 0.58, blue: 0.22, alpha: 0.45).cgColor
        b.layer.shadowOpacity = 1
        b.layer.shadowOffset = .zero
        b.layer.shadowRadius = 14
        let config = UIImage.SymbolConfiguration(pointSize: 30, weight: .semibold)
        let micIcon = UIImage(systemName: "mic.fill", withConfiguration: config)
        b.setImage(micIcon, for: .normal)
        b.tintColor = .white
        b.addTarget(self, action: #selector(voiceBallTapped), for: .touchUpInside)
        return b
    }()

    // MARK: - State
    private var messages: [TGMessage] = []
    private var voiceBallState: VoiceBallState = .idle
    private var pulseLayer: CABasicAnimation?
    /// 用户语音中间结果缓存（不直接显示，等待最终确认或 AI 开始回复时再展示）
    private var pendingUserText: String?
    /// AI 流式拼接缓存（不直接显示，等 TTS 句子完整时再展示）
    private var pendingAIText: String?

    // MARK: - 对话录音（用于声音复刻）
    /// 并行录音器：对话期间录制用户语音，供声音复刻训练使用
    private var sessionRecorder: AVAudioRecorder?
    /// 最近一次对话的录音文件 URL
    private(set) var lastSessionRecordingURL: URL?
    /// 与录音文件配对的 sessionId（用于详情页查找 recordings/{sessionId}.m4a）
    private(set) var lastSessionId: String?

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .warmBackground
        navigationController?.navigationBar.isHidden = true
        hideKeyboardWhenTapped()
        setupLayout()
        setupNotifications()
        updateVoiceBallState(.idle)
        // 预初始化 Dialog 引擎
        DialogEngineManager.shared.delegate = self
        DialogEngineManager.shared.setup()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // 动态更新 bottomContainer 底部位置，确保紧贴 WarmTabBar 顶部。
        // ⚠️ 不读 view.safeAreaInsets.bottom：detail 页 hidesBottomBarWhenPushed 触发的
        // safeArea 重算会让该值变大，导致返回后三合一按钮悬浮过高。
        // 改为通过 keyWindow 取纯系统 home indicator 高度。
        let safeBottom = Self.systemBottomSafeInset
        bottomContainerBottomConstraint.constant = -(WarmTabBarView.tabBarHeight + safeBottom)
    }

    /// 通过 keyWindow 获取纯系统 home indicator 高度，避免 push/pop detail 时 view.safeAreaInsets 被污染
    private static var systemBottomSafeInset: CGFloat {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first(where: { $0.isKeyWindow })?
            .safeAreaInsets.bottom ?? 0
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - Layout
    private func setupLayout() {
        view.addSubview(titleLabel)
        view.addSubview(messageTableView)
        view.addSubview(bottomDivider)
        view.addSubview(bottomContainer)

        bottomContainer.addSubview(albumButton)
        bottomContainer.addSubview(voiceBallButton)
        bottomContainer.addSubview(cameraButton)

        [titleLabel, messageTableView, bottomDivider, bottomContainer,
         albumButton, voiceBallButton, cameraButton].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
        }

        let ballSize: CGFloat = 80
        let sideSize: CGFloat = 44

        // 底部操作区底部约束（动态调整避开 TabBar）
        bottomContainerBottomConstraint = bottomContainer.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -56)

        NSLayoutConstraint.activate([
            // 顶部标题
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),

            // 消息流
            messageTableView.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 12),
            messageTableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            messageTableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            messageTableView.bottomAnchor.constraint(equalTo: bottomDivider.topAnchor),

            // 分割线
            bottomDivider.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bottomDivider.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bottomDivider.heightAnchor.constraint(equalToConstant: 0.5),
            bottomDivider.bottomAnchor.constraint(equalTo: bottomContainer.topAnchor),

            // 底部操作区
            bottomContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            bottomContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            bottomContainerBottomConstraint,
            bottomContainer.heightAnchor.constraint(equalToConstant: 110),
            
            // 语音球（中央）
            voiceBallButton.widthAnchor.constraint(equalToConstant: ballSize),
            voiceBallButton.heightAnchor.constraint(equalToConstant: ballSize),
            voiceBallButton.centerXAnchor.constraint(equalTo: bottomContainer.centerXAnchor),
            voiceBallButton.centerYAnchor.constraint(equalTo: bottomContainer.centerYAnchor, constant: -4),
            
            // 左侧相册按鈕
            albumButton.widthAnchor.constraint(equalToConstant: sideSize),
            albumButton.heightAnchor.constraint(equalToConstant: sideSize),
            albumButton.centerYAnchor.constraint(equalTo: voiceBallButton.centerYAnchor),
            albumButton.trailingAnchor.constraint(equalTo: voiceBallButton.leadingAnchor, constant: -44),
            
            // 右侧拍照按鈕
            cameraButton.widthAnchor.constraint(equalToConstant: sideSize),
            cameraButton.heightAnchor.constraint(equalToConstant: sideSize),
            cameraButton.centerYAnchor.constraint(equalTo: voiceBallButton.centerYAnchor),
            cameraButton.leadingAnchor.constraint(equalTo: voiceBallButton.trailingAnchor, constant: 44),
        ])
    }

    // MARK: - Voice Ball State Machine
    private func updateVoiceBallState(_ state: VoiceBallState) {
        voiceBallState = state
        voiceBallButton.layer.removeAnimation(forKey: "pulse")
        voiceBallButton.layer.removeAllAnimations()

        let orangeColor = UIColor(red: 0.93, green: 0.58, blue: 0.22, alpha: 1.0)
        let stopColor = UIColor(red: 0.85, green: 0.30, blue: 0.20, alpha: 1.0)

        switch state {
        case .idle:
            voiceBallButton.backgroundColor = orangeColor
            voiceBallButton.layer.shadowColor = UIColor(red: 0.93, green: 0.58, blue: 0.22, alpha: 0.45).cgColor
            let micConfig = UIImage.SymbolConfiguration(pointSize: 30, weight: .semibold)
            voiceBallButton.setImage(UIImage(systemName: "mic.fill", withConfiguration: micConfig), for: .normal)
            voiceBallButton.transform = .identity
            startPulseAnimation()
        case .active:
            voiceBallButton.backgroundColor = stopColor
            voiceBallButton.layer.shadowColor = UIColor(red: 0.85, green: 0.30, blue: 0.20, alpha: 0.40).cgColor
            let stopConfig = UIImage.SymbolConfiguration(pointSize: 26, weight: .bold)
            voiceBallButton.setImage(UIImage(systemName: "stop.fill", withConfiguration: stopConfig), for: .normal)
            voiceBallButton.transform = .identity
            startActiveAnimation()
        }
    }

    private func startPulseAnimation() {
        let pulse = CABasicAnimation(keyPath: "transform.scale")
        pulse.duration = 1.8
        pulse.fromValue = 1.0
        pulse.toValue = 1.05
        pulse.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        pulse.autoreverses = true
        pulse.repeatCount = .infinity
        pulseLayer = pulse
        voiceBallButton.layer.add(pulse, forKey: "pulse")
    }

    private func startActiveAnimation() {
        let pulse = CABasicAnimation(keyPath: "transform.scale")
        pulse.duration = 1.2
        pulse.fromValue = 1.0
        pulse.toValue = 1.08
        pulse.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        pulse.autoreverses = true
        pulse.repeatCount = .infinity
        pulseLayer = pulse
        voiceBallButton.layer.add(pulse, forKey: "pulse")
    }

    // MARK: - Actions
    @objc private func voiceBallTapped() {
        switch voiceBallState {
        case .idle:
            startRecording()
        case .active:
            stopRecording()
        }
    }

    @objc private func cameraTapped() {
        #if targetEnvironment(simulator)
        showToast("模拟器无法使用相机，请在真机上测试", type: .info)
        #else
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = self
        present(picker, animated: true)
        #endif
    }

    @objc private func albumTapped() {
        let picker = UIImagePickerController()
        picker.sourceType = .photoLibrary
        picker.delegate = self
        present(picker, animated: true)
    }

    // MARK: - Mock Dialog
    private func startRecording() {
        MicrophonePermissionManager.shared.requestPermission { [weak self] granted in
            guard let self = self else { return }
            if granted {
                // 先启动 DialogEngine（由 SDK 配置 AudioSession），再启动并行录音（共享同一 AudioSession）
                // 顺序很重要：如果先启动 AVAudioRecorder，它会隐式修改 AudioSession 配置，可能影响 SDK 的 AEC
                DialogEngineManager.shared.startDialog()
                self.startSessionRecording()
            } else {
                MicrophonePermissionManager.shared.showPermissionDeniedAlert(on: self)
                self.updateVoiceBallState(.idle)
            }
        }
    }

    private func stopRecording() {
        // 先停止并行录音，再停止 DialogEngine
        stopSessionRecording()
        DialogEngineManager.shared.stopDialog()
    }

    private func handleRecognizeAndReply() {
        // 实际流程由 DialogEngineDelegate 回调驱动，此方法保留作为手动停止后的备用处理
    }

    private func scrollToBottom() {
        guard !messages.isEmpty else { return }
        let indexPath = IndexPath(row: messages.count - 1, section: 0)
        messageTableView.scrollToRow(at: indexPath, at: .bottom, animated: true)
    }

    private func setupNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleLogout),
            name: .djUserDidLogout,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleDidEnterBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleWillEnterForeground),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )
    }

    @objc private func handleLogout() {
        messages = []
        messageTableView.reloadData()
        updateVoiceBallState(.idle)
        DialogEngineManager.shared.destroyEngine()
    }

    @objc private func handleDidEnterBackground() {
        if DialogEngineManager.shared.isDialogActive {
            DialogEngineManager.shared.stopDialog()
            updateVoiceBallState(.idle)
        }
        // 安全防护：确保并行录音也被停止（正常流程由 onDialogEnded 触发，此处兜底）
        stopSessionRecording()
    }

    @objc private func handleWillEnterForeground() {
        if !DialogEngineManager.shared.isEngineReady {
            DialogEngineManager.shared.setup()
        }
        // 检查声音复刻训练是否在后台完成（Timer 会被挂起，需要手动检查）
        VoiceCloneService.shared.checkPendingTraining()
    }
}

// MARK: - UITableViewDataSource
extension AIRecordingViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return messages.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let msg = messages[indexPath.row]
        switch msg {
        case .ai(let text, let ts):
            let cell = tableView.dequeueReusableCell(withIdentifier: "AIMessageCell", for: indexPath) as! TGMessageCell
            cell.configure(text: text, isUser: false, timestamp: ts)
            return cell
        case .user(let text, let ts):
            let cell = tableView.dequeueReusableCell(withIdentifier: "UserMessageCell", for: indexPath) as! TGMessageCell
            cell.configure(text: text, isUser: true, timestamp: ts)
            return cell
        case .photo(let imagePath, let ts):
            let cell = tableView.dequeueReusableCell(withIdentifier: "PhotoCell", for: indexPath) as! TGPhotoCell
            cell.configure(imagePath: imagePath, timestamp: ts)
            return cell
        case .privacyConfirmation:
            let cell = tableView.dequeueReusableCell(withIdentifier: "PrivacyCell", for: indexPath) as! TGPrivacyCell
            return cell
        }
    }
}

// MARK: - UITableViewDelegate
extension AIRecordingViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        let msg = messages[indexPath.row]
        switch msg {
        case .photo:
            return TGPhotoCell.cellHeight
        case .privacyConfirmation:
            return 80
        case .ai(let text, _), .user(let text, _):
            // 与 TGMessageCell.sizeThatFits 保持一致
            let maxWidth = UIScreen.main.bounds.width * 0.72
            let label = UILabel()
            label.numberOfLines = 0
            label.font = .systemFont(ofSize: 16)
            let paragraphStyle = NSMutableParagraphStyle()
            paragraphStyle.lineSpacing = 5
            label.attributedText = NSAttributedString(string: text, attributes: [
                .font: UIFont.systemFont(ofSize: 16),
                .paragraphStyle: paragraphStyle
            ])
            let hPad: CGFloat = 16
            let vPad: CGFloat = 12
            let textSize = label.sizeThatFits(CGSize(width: maxWidth - hPad * 2, height: .infinity))
            return textSize.height + vPad * 2 + 8 + 17 + 6
        }
    }
}

// MARK: - UIImagePickerControllerDelegate
extension AIRecordingViewController: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        picker.dismiss(animated: true)
        guard let image = info[.originalImage] as? UIImage else { return }

        // 保存图片到本地 Documents/photos/ 目录
        let imagePath = savePhotoToLocal(image)

        // 显示为用户消息气泡（含缩略图）
        messages.append(.photo(imagePath: imagePath, timestamp: Date()))
        // AI 回复
        messages.append(.ai(text: "照片收到了！能不能跟我说说这张照片背后的故事？", timestamp: Date()))
        messageTableView.reloadData()
        scrollToBottom()

        // 记录到对话记忆
        ConversationMemoryManager.shared.recordUserTurn(text: "[发送了一张照片]")
        ConversationMemoryManager.shared.recordAITurn(text: "照片收到了！能不能跟我说说这张照片背后的故事？")
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }

    /// 将图片保存到本地 Documents/photos/ 目录，返回文件路径
    private func savePhotoToLocal(_ image: UIImage) -> String {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let photosDir = docs.appendingPathComponent("photos")
        try? FileManager.default.createDirectory(at: photosDir, withIntermediateDirectories: true)

        let fileName = "photo_\(Int(Date().timeIntervalSince1970)).jpg"
        let fileURL = photosDir.appendingPathComponent(fileName)

        if let data = image.jpegData(compressionQuality: 0.8) {
            try? data.write(to: fileURL)
        }

        return fileURL.path
    }
}

// MARK: - DialogEngineDelegate
extension AIRecordingViewController: DialogEngineDelegate {

    func onDialogStarted() {
        // 保留历史消息，不清空（新会话消息追加在旧消息下方）
        pendingUserText = nil
        pendingAIText = nil
        updateVoiceBallState(.active)
    }

    func onASRResult(text: String, isFinal: Bool) {
        if isFinal {
            // 最终结果：直接显示为正式用户消息
            pendingUserText = nil
            messages.append(.user(text: text, timestamp: Date()))
            messageTableView.reloadData()
            scrollToBottom()
            // 记录到对话记忆
            ConversationMemoryManager.shared.recordUserTurn(text: text)
        } else {
            // 中间结果：只记录不显示，等待最终确认
            pendingUserText = text
        }
    }

    func onTTSStarted(text: String) {
        // AI 开始说话前，将待确认的用户文本显示出来
        flushPendingUserText()
        // 清空流式缓存（TTS 已提供完整文本）
        pendingAIText = nil
        // 显示完整的 AI 句子
        messages.append(.ai(text: text, timestamp: Date()))
        messageTableView.reloadData()
        scrollToBottom()
        // 记录到对话记忆
        ConversationMemoryManager.shared.recordAITurn(text: text)
    }

    func onChatStreaming(text: String) {
        // 流式拼接：不更新 UI，只记录最新累积文本（用于 chat 结束时兜底展示）
        pendingAIText = text
    }

    /// 将待确认的用户文本发布为正式消息
    private func flushPendingUserText() {
        if let text = pendingUserText, !text.isEmpty {
            messages.append(.user(text: text, timestamp: Date()))
            // 记录到对话记忆
            ConversationMemoryManager.shared.recordUserTurn(text: text)
            pendingUserText = nil
        }
    }

    func onTTSFinished() {
        // TTS 播报结束，保持 active 状态等待用户继续说话
    }

    func onError(error: Error) {
        updateVoiceBallState(.idle)
        showToast(error.localizedDescription, type: .error)
    }

    func onDialogEnded(reason: DialogEndReason) {
        // 对话结束时，刷新未展示的待确认文本
        flushPendingUserText()
        // 如果有未展示的 AI 流式文本（没有经过 TTS），兜底展示
        if let aiText = pendingAIText, !aiText.isEmpty {
            messages.append(.ai(text: aiText, timestamp: Date()))
            ConversationMemoryManager.shared.recordAITurn(text: aiText)
            pendingAIText = nil
            messageTableView.reloadData()
            scrollToBottom()
        }
        // 结束会话：提取摘要并持久化
        ConversationMemoryManager.shared.endSession()
        updateVoiceBallState(.idle)

        switch reason {
        case .keyword(let kw):
            showToast("寻梦环游已经记住您说的了，下次再聊～", type: .success)
        case .silenceTimeout:
            showToast("您好像有事忙，寻梦环游先告辞啦～", type: .info)
        case .manual:
            break
        case .serverEnded:
            break
        }

        // 延迟弹出回忆录生成卡片（等待 toast 消失后）
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.showMemoirGenerationCard()
        }
    }

    // MARK: - 对话并行录音（用于声音复刻训练）

    /// 开始并行录音（与豆包 SDK 同时录制，用于声音复刻）
    private func startSessionRecording() {
        let recordingsDir = FileManager.default.temporaryDirectory.appendingPathComponent("TGSessionRecordings")
        try? FileManager.default.createDirectory(at: recordingsDir, withIntermediateDirectories: true)
        let fileURL = recordingsDir.appendingPathComponent("session_\(Int(Date().timeIntervalSince1970)).m4a")

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 16000,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue
        ]

        do {
            sessionRecorder = try AVAudioRecorder(url: fileURL, settings: settings)
            sessionRecorder?.record()
            DDLogInfo("[AIRecording] 并行录音已启动: \(fileURL.lastPathComponent)")
        } catch {
            DDLogWarn("[AIRecording] 并行录音启动失败: \(error.localizedDescription)")
            sessionRecorder = nil
        }
    }

    /// 停止并行录音并保存到持久化目录
    private func stopSessionRecording() {
        guard let recorder = sessionRecorder, recorder.isRecording else {
            sessionRecorder = nil
            return
        }

        // Bug fix: 在 stop() 之前读取 currentTime，部分 iOS 版本 stop() 后 currentTime 会重置为 0
        let duration = recorder.currentTime
        recorder.stop()

        let url = recorder.url
        // 检查录音时长，至少 3 秒才有价值用于声音复刻
        if duration >= 3 {
            // 移动到 Application Support 持久化目录（tmp 目录可能被系统清理）
            let sessionId = "session_\(Int(Date().timeIntervalSince1970))"
            if let persistentURL = MemoirRepository.shared.saveRecording(from: url, sessionId: sessionId) {
                lastSessionRecordingURL = persistentURL
                lastSessionId = sessionId   // 记录 sessionId，生成回忆录时一并传给 MemoirFlowManager
                DDLogInfo("[AIRecording] 对话录音已持久化: \(persistentURL.lastPathComponent), 时长: \(String(format: "%.1f", duration))秒")
            } else {
                // 持久化失败则退回使用 tmp 文件
                lastSessionRecordingURL = url
                lastSessionId = nil
                DDLogWarn("[AIRecording] 录音持久化失败，使用 tmp 文件: \(url.lastPathComponent)")
            }
        } else {
            lastSessionRecordingURL = nil
            lastSessionId = nil
            try? FileManager.default.removeItem(at: url)
            DDLogInfo("[AIRecording] 对话录音太短(\(String(format: "%.1f", duration))秒)，已丢弃")
        }
        sessionRecorder = nil
    }

    /// 显示回忆录生成弹窗
    private func showMemoirGenerationCard() {
        MemoirGenerationCard.show(in: view,
            onGenerate: { [weak self] in
                self?.handleMemoirGeneration()
            },
            onDismiss: nil
        )
    }

    /// 处理回忆录生成请求
    private func handleMemoirGeneration() {
        // 将 TGMessage 转换为 Memoir 模块的 DialogMessage 格式
        let dialogMessages = MemoirFlowManager.convertToDialogMessages(messages)

        // 本地内容质量检测（即时反馈，无需等 API 调用）
        if let reason = MemoirFlowManager.checkDialogContent(dialogMessages) {
            showToast(reason, type: .info)
            return
        }

        MemoirFlowManager.shared.startGeneration(
            on: self,
            dialogMessages: dialogMessages,
            recordingURL: lastSessionRecordingURL,
            sessionId: lastSessionId
        )
    }
}
