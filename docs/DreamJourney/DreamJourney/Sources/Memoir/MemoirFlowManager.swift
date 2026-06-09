import UIKit
import CocoaLumberjack

// MARK: - 回忆录流程管理器

/// 统一管理回忆录相关流程的入口，将外部 VC 与 Memoir 模块解耦
/// 外部只需调用：
///   1. MemoirFlowManager.shared.startGeneration(on: vc, dialogMessages: dialogs, recordingURL: url)  — 直接生成
///   2. MemoirFlowManager.shared.showGenerateButton(on: vc, dialogMessages: dialogs, recordingURL: url) — 先弹按钮再生成
///   3. MemoirFlowManager.shared.pushMemoirDetail(from: vc, memoir: model)
///   4. MemoirFlowManager.shared.pushMemoirList(from: vc)
///
/// 生成流程（方案 A：音频合成包含在"生成回忆录"中）：
///   Loading("正在生成回忆录...") → DeepSeek 生成文本 → 准备音色 → Loading("正在合成语音...") → TTS 合成 → 跳转详情页
///   如果无音色或音色不可用，跳过合成步骤，直接跳转
final class MemoirFlowManager {

    static let shared = MemoirFlowManager()

    // MARK: - 对话结束 → 弹出"生成回忆录"按钮

    /// 在指定 VC 上弹出一个"生成回忆录"悬浮按钮
    /// - Parameters:
    ///   - viewController: 宿主 VC（通常是 AIRecordingVC）
    ///   - dialogMessages: 对话消息列表（会被转换为 [DialogMessage]）
    ///   - sourceView: 按钮定位参考视图（语音球），为 nil 则居中显示
    func showGenerateButton(on viewController: UIViewController,
                            dialogMessages: [DialogMessage],
                            recordingURL: URL? = nil,
                            sourceView: UIView? = nil) {
        guard !dialogMessages.isEmpty else {
            DDLogWarn("[MemoirFlow] 对话为空，跳过生成按钮")
            return
        }

        // 避免重复添加
        viewController.view.viewWithTag(999_777)?.removeFromSuperview()

        let button = UIButton(type: .system)
        button.tag = 999_777
        button.setTitle("  生成回忆录", for: .normal)
        button.setImage(UIImage(systemName: "book.fill"), for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        button.setTitleColor(.white, for: .normal)
        button.tintColor = .white
        button.backgroundColor = UIColor.warmDeep
        button.layer.cornerRadius = 24
        button.layer.shadowColor = UIColor.black.cgColor
        button.layer.shadowOpacity = 0.15
        button.layer.shadowOffset = CGSize(width: 0, height: 4)
        button.layer.shadowRadius = 8
        button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 20, bottom: 12, right: 20)
        button.sizeToFit()
        button.frame.size.width = max(button.frame.width + 40, 180)
        button.frame.size.height = 48

        // 定位：在底部容器上方居中
        viewController.view.addSubview(button)
        button.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            button.centerXAnchor.constraint(equalTo: viewController.view.centerXAnchor),
            button.bottomAnchor.constraint(equalTo: viewController.view.safeAreaLayoutGuide.bottomAnchor, constant: -170),
            button.widthAnchor.constraint(greaterThanOrEqualToConstant: 180),
            button.heightAnchor.constraint(equalToConstant: 48)
        ])

        // 点击事件
        let memoirMessages = dialogMessages  // 捕获
        let capturedRecordingURL = recordingURL  // 捕获录音 URL
        button.addTargetClosure { [weak self, weak viewController] in
            guard let vc = viewController else { return }
            self?.startMemoirGeneration(on: vc, dialogMessages: memoirMessages, recordingURL: capturedRecordingURL)
            // 移除按钮
            vc.view.viewWithTag(999_777)?.removeFromSuperview()
        }

        // 入场动画
        button.alpha = 0
        button.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)
        UIView.animate(withDuration: 0.4, delay: 0.3, usingSpringWithDamping: 0.7, initialSpringVelocity: 0.5, options: [], animations: {
            button.alpha = 1
            button.transform = .identity
        })

        // 8秒后自动消失
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak button] in
            guard let btn = button, btn.superview != nil else { return }
            UIView.animate(withDuration: 0.3, animations: {
                btn.alpha = 0
                btn.transform = CGAffineTransform(scaleX: 0.8, y: 0.8)
            }) { _ in
                btn.removeFromSuperview()
            }
        }
    }

    // MARK: - 直接生成回忆录（跳过悬浮按钮，常用于已有确认弹窗后直接调用）

    /// 直接启动回忆录生成流程：loading → DeepSeek API → 跳转详情页
    /// - Parameters:
    ///   - viewController: 宿主 VC
    ///   - dialogMessages: 对话消息列表
    ///   - recordingURL: 对话录音文件 URL（可选，用于声音复刻训练）
    ///   - sessionId: 录音文件的 sessionId（与 recordings/{sessionId}.m4a 对应，详情页据此回放）
    func startGeneration(on viewController: UIViewController,
                         dialogMessages: [DialogMessage],
                         recordingURL: URL? = nil,
                         sessionId: String? = nil) {
        startMemoirGeneration(on: viewController, dialogMessages: dialogMessages, recordingURL: recordingURL, sessionId: sessionId)
    }

    // MARK: - 生成回忆录（内部实现）

    /// 多步流水线：文本生成 → 声音复刻就绪 → 音频合成 → 跳转详情
    /// 用户全程看到 loading，loading 文案随阶段更新
    /// 只有文本和音频都就绪后才跳转到详情页
    private func startMemoirGeneration(on viewController: UIViewController,
                                        dialogMessages: [DialogMessage],
                                        recordingURL: URL? = nil,
                                        sessionId: String? = nil) {
        // 显示 loading
        let loadingView = createLoadingView(message: "正在生成回忆录...")
        viewController.view.addSubview(loadingView)
        loadingView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            loadingView.centerXAnchor.constraint(equalTo: viewController.view.centerXAnchor),
            loadingView.centerYAnchor.constraint(equalTo: viewController.view.centerYAnchor),
            loadingView.widthAnchor.constraint(equalToConstant: 200),
            loadingView.heightAnchor.constraint(equalToConstant: 120)
        ])

        // 标记 loading 是否已移除（避免流程出错时重复移除）
        var loadingRemoved = false
        let dismissLoading: () -> Void = {
            guard !loadingRemoved else { return }
            loadingRemoved = true
            loadingView.removeFromSuperview()
        }

        // ── 第一步：DeepSeek 生成回忆录文本 ──
        MemoirService.shared.generateMemoir(dialogMessages: dialogMessages) { [weak viewController] result in
            switch result {
            case .success(let originalMemoir):
                DDLogInfo("[MemoirFlow] 回忆录文本生成成功: \(originalMemoir.title)")

                // 把 sessionId 注入 memoir，并立刻持久化（让详情页可通过 sessionId 找到本地录音 m4a）
                var memoir = originalMemoir
                if let sid = sessionId, !sid.isEmpty {
                    memoir.sessionId = sid
                    MemoirRepository.shared.save(memoir)
                    DDLogInfo("[MemoirFlow] 已绑定 sessionId 到 memoir: \(sid)")
                }

                // ── 第二步：确保声音复刻音色就绪 ──
                // 场景 A：已有 speakerId → 等待就绪（可能还在训练中）
                // 场景 B：无 speakerId 但有录音 → 先训练，再等待就绪
                // 场景 C：无 speakerId 也无录音 → 跳过，直接跳转（无音频）
                self.prepareVoiceClone(recordingURL: recordingURL) { [weak viewController] speakerId in
                    if let speakerId = speakerId {
                        // ── 第三步：音频合成 ──
                        DDLogInfo("[MemoirFlow] 音色就绪，开始合成音频: \(speakerId)")
                        DispatchQueue.main.async {
                            self.updateLoadingView(loadingView, message: "正在合成语音...")
                        }

                        // 确保 memoir 模型携带 speakerId
                        var memoirForSynth = memoir
                        if memoirForSynth.speakerId == nil {
                            memoirForSynth.speakerId = speakerId
                            MemoirRepository.shared.save(memoirForSynth)
                        }

                        MemoirTTSService.shared.synthesize(memoir: memoirForSynth) { result in
                            DispatchQueue.main.async {
                                dismissLoading()
                                guard let vc = viewController else { return }

                                switch result {
                                case .success(let audioURL):
                                    DDLogInfo("[MemoirFlow] 音频合成完成: \(audioURL.lastPathComponent)")
                                    // 更新 Repository 中的音频文件名
                                    if var updated = MemoirRepository.shared.get(by: memoir.id) {
                                        updated.audioFileName = audioURL.lastPathComponent
                                        if updated.speakerId == nil {
                                            updated.speakerId = speakerId
                                        }
                                        MemoirRepository.shared.save(updated)
                                    }
                                    self.showMemoirReadyBanner(in: vc, memoirTitle: memoir.title)

                                case .failure(let error):
                                    DDLogWarn("[MemoirFlow] 音频合成失败: \(error.localizedDescription)，已保存回忆录（无音频）")
                                    self.showMemoirReadyBanner(in: vc, memoirTitle: memoir.title)
                                }
                            }
                        }
                    } else {
                        // 无音色，跳过合成，回忆录已保存，展示引导提示
                        DispatchQueue.main.async {
                            dismissLoading()
                            guard let vc = viewController else { return }
                            self.showMemoirReadyBanner(in: vc, memoirTitle: memoir.title)
                        }
                    }
                }

            case .failure(let error):
                DispatchQueue.main.async {
                    dismissLoading()
                    guard let vc = viewController else { return }
                    DDLogError("[MemoirFlow] 回忆录生成失败: \(error.localizedDescription)")
                    vc.showToast("生成失败：\(error.localizedDescription)", type: .error)
                }
            }
        }
    }

    // MARK: - 准备声音复刻音色

    /// 确保声音复刻音色就绪。有三种场景：
    /// A. 已有 speakerId → 等待就绪（可能训练中）
    /// B. 无 speakerId 但有录音 → 先发起训练，再等待就绪
    /// C. 无 speakerId 也无录音 → 回调 nil（跳过合成）
    private func prepareVoiceClone(recordingURL: URL?,
                                    completion: @escaping (_ speakerId: String?) -> Void) {
        // A. 已有 speakerId
        if let existingId = VoiceCloneService.shared.currentSpeakerId {
            DDLogInfo("[MemoirFlow] 已有 speakerId: \(existingId)，等待音色就绪")
            VoiceCloneService.shared.waitForVoiceReady(speakerId: existingId) { result in
                switch result {
                case .success(let id):
                    completion(id)
                case .failure:
                    DDLogWarn("[MemoirFlow] 音色等待失败，跳过音频合成")
                    completion(nil)
                }
            }
            return
        }

        // B. 无 speakerId 但有录音 → 先训练
        if let recordingURL = recordingURL {
            DDLogInfo("[MemoirFlow] 无 speakerId，使用录音开始声音复刻训练")
            VoiceCloneService.shared.trainVoice(audioURL: recordingURL) { [weak self] result in
                switch result {
                case .success(let speakerId):
                    DDLogInfo("[MemoirFlow] 声音复刻训练成功: \(speakerId)")
                    // 训练完成，开始合成
                    completion(speakerId)
                case .failure(let error):
                    DDLogWarn("[MemoirFlow] 声音复刻训练失败: \(error.localizedDescription)，跳过音频合成")
                    completion(nil)
                }
            }
            return
        }

        // C. 无 speakerId 也无录音
        DDLogInfo("[MemoirFlow] 无 speakerId 且无录音，跳过音频合成")
        completion(nil)
    }

    // MARK: - 页面跳转

    /// 推入回忆录详情页（供外部调用，足迹页内部查看用）
    func pushMemoirDetail(from viewController: UIViewController, memoir: MemoirModel) {
        let detailVC = MemoirDetailViewController(memoir: memoir)
        viewController.navigationController?.pushViewController(detailVC, animated: true)
    }

    /// 回忆录生成成功后：在首页显示引导横幅（不跳转 Tab）
    private func showMemoirReadyBanner(in viewController: UIViewController, memoirTitle: String) {
        let targetView: UIView = viewController.view.window?.rootViewController?.view ?? viewController.view
        let banner = FootprintNotificationBanner()
        banner.configure(message: "回忆录「\(memoirTitle)」已保存到足迹")
        banner.onDetailTapped = { [weak viewController] in
            // 点击「查看详情」→ 在足迹 Tab 的 NavigationController 内 push 详情页
            guard let memoir = MemoirRepository.shared.getAll().first(where: { $0.title == memoirTitle }) else { return }
            if let tabBar = viewController?.tabBarController,
               let mapNav = tabBar.viewControllers?[1] as? UINavigationController {
                let detailVC = MemoirDetailViewController(memoir: memoir)
                mapNav.pushViewController(detailVC, animated: true)
            }
        }
        banner.show(in: targetView, topOffset: 60)
        DDLogInfo("[MemoirFlow] 回忆录已保存，展示引导横幅: \(memoirTitle)")
    }

    /// 推入回忆录列表弹窗（简易版：ActionSheet 选择已有回忆录）
    func pushMemoirList(from viewController: UIViewController) {
        let memoirs = MemoirRepository.shared.getAll()
        guard !memoirs.isEmpty else {
            viewController.showToast("还没有回忆录，快去对话生成吧", type: .info)
            return
        }

        let alert = UIAlertController(title: "我的回忆录", message: nil, preferredStyle: .actionSheet)
        for memoir in memoirs.prefix(10) {
            alert.addAction(UIAlertAction(title: memoir.title, style: .default) { _ in
                self.pushMemoirDetail(from: viewController, memoir: memoir)
            })
        }
        alert.addAction(UIAlertAction(title: "取消", style: .cancel))
        viewController.present(alert, animated: true)
    }

    // MARK: - 对话内容质量检测（本地规则，即时反馈）

    /// 检测对话内容是否足够生成有意义的回忆录
    /// - Returns: 通过返回 nil，不通过返回拒绝原因
    static func checkDialogContent(_ dialogMessages: [DialogMessage]) -> String? {
        // 只看用户发的消息
        let userMessages = dialogMessages.filter { $0.role == "user" }

        // 规则1: 用户发言轮次 < 2
        if userMessages.count < 2 {
            return "对话内容较少，无法生成回忆录，请多分享一些您的回忆噢"
        }

        // 规则2: 用户总字数 < 50
        let totalText = userMessages.map { $0.text }.joined()
        let charCount = totalText.trimmingCharacters(in: .whitespacesAndNewlines).count
        if charCount < 50 {
            return "对话内容较少，无法生成回忆录，请多分享一些您的回忆噢"
        }

        // 规则3: 去重后有效内容占比 < 40%
        // 去掉标点和空格后，看不同字符的占比
        // 例如 "好的好的好的好的" 去重后只有"好的"2个字，占比极低
        let meaningfulChars = totalText
            .components(separatedBy: .punctuationCharacters)
            .joined()
            .components(separatedBy: .whitespacesAndNewlines)
            .joined()
            .filter { !$0.isPunctuation && !($0 == " ") }

        guard !meaningfulChars.isEmpty else {
            return "对话内容较少，无法生成回忆录，请多分享一些您的回忆噢"
        }

        let uniqueChars = Set(meaningfulChars)
        let uniqueRatio = Double(uniqueChars.count) / Double(meaningfulChars.count)

        if uniqueRatio < 0.4 {
            return "对话内容较少，无法生成回忆录，请多分享一些您的回忆噢"
        }

        return nil
    }

    // MARK: - TGMessage → DialogMessage 转换

    /// 将 AIRecordingVC 的 [TGMessage] 转换为 [DialogMessage]（Memoir 模块使用的格式）
    static func convertToDialogMessages(_ tgMessages: [TGMessage]) -> [DialogMessage] {
        return tgMessages.compactMap { msg -> DialogMessage? in
            switch msg {
            case .user(let text, _):
                return DialogMessage(role: "user", text: text)
            case .ai(let text, _):
                return DialogMessage(role: "ai", text: text)
            case .photo(_, _), .privacyConfirmation:
                return nil
            }
        }
    }

    // MARK: - Loading View

    /// 更新 loading 视图的文案（如从"正在生成回忆录"切换到"正在合成语音"）
    private func updateLoadingView(_ loadingView: UIView, message: String) {
        // message label 是 container 的第二个子视图（indicator 之后的 UILabel）
        if let label = loadingView.subviews.compactMap({ $0 as? UILabel }).first {
            UIView.transition(with: label, duration: 0.3, options: .transitionCrossDissolve) {
                label.text = message
            }
        }
    }

    private func createLoadingView(message: String) -> UIView {
        let container = UIView()
        container.backgroundColor = UIColor.warmSurface
        container.layer.cornerRadius = 16
        container.layer.shadowColor = UIColor.black.cgColor
        container.layer.shadowOpacity = 0.1
        container.layer.shadowOffset = CGSize(width: 0, height: 2)
        container.layer.shadowRadius = 8
        container.clipsToBounds = false

        let indicator = UIActivityIndicatorView(style: .medium)
        indicator.color = .warmPrimary
        indicator.startAnimating()

        let label = UILabel()
        label.text = message
        label.font = .systemFont(ofSize: 14, weight: .medium)
        label.textColor = .warmPrimary
        label.textAlignment = .center

        container.addSubview(indicator)
        container.addSubview(label)
        indicator.translatesAutoresizingMaskIntoConstraints = false
        label.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            indicator.topAnchor.constraint(equalTo: container.topAnchor, constant: 20),
            indicator.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            label.topAnchor.constraint(equalTo: indicator.bottomAnchor, constant: 16),
            label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 16),
            label.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -16),
            label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -20)
        ])

        return container
    }
}

// MARK: - UIButton Closure 扩展

private var buttonClosureKey: UInt8 = 0

extension UIButton {
    func addTargetClosure(_ closure: @escaping () -> Void) {
        objc_setAssociatedObject(self, &buttonClosureKey, closure, .OBJC_ASSOCIATION_COPY)
        addTarget(self, action: #selector(invokeClosure), for: .touchUpInside)
    }

    @objc private func invokeClosure() {
        if let closure = objc_getAssociatedObject(self, &buttonClosureKey) as? () -> Void {
            closure()
        }
    }
}