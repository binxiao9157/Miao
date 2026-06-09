import UIKit
import AVFoundation
import CocoaLumberjack

// MARK: - 回忆录详情页

/// 展示回忆录全文、播放语音朗读、编辑内容
/// 适老化设计：大字体、高对比度、简洁交互
final class MemoirDetailViewController: UIViewController {

    // MARK: - Properties

    private var memoir: MemoirModel
    private var isEditingMode = false
    private var isPlaying = false

    // MARK: - UI: 滚动容器

    private lazy var scrollView: UIScrollView = {
        let sv = UIScrollView()
        sv.showsVerticalScrollIndicator = false
        sv.contentInset = UIEdgeInsets(top: 0, left: 0, bottom: 160, right: 0)
        return sv
    }()

    private lazy var contentStack: UIStackView = {
        let s = UIStackView()
        s.axis = .vertical
        s.spacing = 20
        return s
    }()

    // MARK: - UI: 标题区

    private let titleLabel: UILabel = {
        let l = UILabel()
        l.font = .boldSystemFont(ofSize: 24)  // 适老化：大标题
        l.textColor = UIColor(hex: "#3D2B1F")  // warmPrimary
        l.numberOfLines = 0
        return l
    }()

    private let titleTextField: UITextField = {
        let f = UITextField()
        f.font = .boldSystemFont(ofSize: 24)
        f.textColor = UIColor(hex: "#3D2B1F")
        f.borderStyle = .roundedRect
        f.isHidden = true
        return f
    }()

    // MARK: - UI: 信息卡片（时间·地点·人物）

    private lazy var infoCard: UIView = {
        let v = UIView()
        v.backgroundColor = UIColor(hex: "#FAF7F2")  // warmBackground
        v.layer.cornerRadius = 12
        return v
    }()

    private lazy var infoStack: UIStackView = {
        let s = UIStackView()
        s.axis = .vertical
        s.spacing = 10
        return s
    }()

    // 时间
    private let timeLabel: UILabel = {
        let l = UILabel()
        l.font = .systemFont(ofSize: 17)
        l.textColor = UIColor(hex: "#6B5B4E")
        return l
    }()

    private let timeTextField: UITextField = {
        let f = UITextField()
        f.font = .systemFont(ofSize: 17)
        f.textColor = UIColor(hex: "#6B5B4E")
        f.borderStyle = .roundedRect
        f.isHidden = true
        return f
    }()

    // 地点
    private let locationLabel: UILabel = {
        let l = UILabel()
        l.font = .systemFont(ofSize: 17)
        l.textColor = UIColor(hex: "#6B5B4E")
        return l
    }()

    private let locationTextField: UITextField = {
        let f = UITextField()
        f.font = .systemFont(ofSize: 17)
        f.textColor = UIColor(hex: "#6B5B4E")
        f.borderStyle = .roundedRect
        f.isHidden = true
        return f
    }()

    // 人物标签
    private lazy var peopleStack: UIStackView = {
        let s = UIStackView()
        s.axis = .horizontal
        s.spacing = 8
        s.alignment = .leading
        s.distribution = .fill
        return s
    }()

    private let peopleTextField: UITextField = {
        let f = UITextField()
        f.font = .systemFont(ofSize: 17)
        f.textColor = UIColor(hex: "#6B5B4E")
        f.borderStyle = .roundedRect
        f.isHidden = true
        f.placeholder = "人物，用逗号分隔"
        return f
    }()

    // MARK: - UI: 散文正文

    private let proseLabel: UILabel = {
        let l = UILabel()
        l.font = .systemFont(ofSize: 18)  // 适老化
        l.textColor = UIColor(hex: "#3D2B1F")
        l.numberOfLines = 0
        l.lineBreakMode = .byCharWrapping
        return l
    }()

    private let proseTextView: UITextView = {
        let tv = UITextView()
        tv.font = .systemFont(ofSize: 18)
        tv.textColor = UIColor(hex: "#3D2B1F")
        tv.backgroundColor = UIColor(hex: "#FAF7F2")
        tv.layer.cornerRadius = 8
        tv.isHidden = true
        return tv
    }()

    /// 散文字数提示
    private let proseCharCountLabel: UILabel = {
        let l = UILabel()
        l.font = .systemFont(ofSize: 13)
        l.textColor = UIColor(hex: "#9E8E7E")
        l.textAlignment = .right
        l.isHidden = true
        return l
    }()

    // MARK: - UI: 语音播放卡片

    private lazy var audioCard: UIView = {
        let v = UIView()
        v.backgroundColor = UIColor(hex: "#f0f5ff")  // 淡蓝底
        v.layer.borderColor = UIColor(hex: "#3D2B1F").withAlphaComponent(0.3).cgColor
        v.layer.borderWidth = 1
        v.layer.cornerRadius = 12
        v.layer.masksToBounds = true
        return v
    }()

    /// 播放/暂停按钮
    private lazy var playButton: UIButton = {
        let b = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 28, weight: .medium)
        b.setImage(UIImage(systemName: "play.circle.fill", withConfiguration: config), for: .normal)
        b.tintColor = UIColor(hex: "#3D2B1F")
        b.addTarget(self, action: #selector(playTapped), for: .touchUpInside)
        return b
    }()

    /// 语音状态/进度标签
    private let audioStatusLabel: UILabel = {
        let l = UILabel()
        l.text = "点击播放回忆录朗读"
        l.font = .systemFont(ofSize: 15, weight: .medium)
        l.textColor = UIColor(hex: "#3D2B1F")
        return l
    }()

    /// 进度条
    private lazy var progressSlider: UISlider = {
        let s = UISlider()
        s.minimumValue = 0
        s.maximumValue = 1
        s.value = 0
        s.isContinuous = true
        s.addTarget(self, action: #selector(sliderChanged), for: .valueChanged)
        return s
    }()

    /// 时间显示
    private let timeDisplayLabel: UILabel = {
        let l = UILabel()
        l.text = "0:00 / 0:00"
        l.font = .monospacedDigitSystemFont(ofSize: 13, weight: .regular)
        l.textColor = UIColor(hex: "#6B5B4E")
        return l
    }()

    /// 合成状态指示器
    private let synthesizingIndicator: UIActivityIndicatorView = {
        let iv = UIActivityIndicatorView(style: .medium)
        iv.hidesWhenStopped = true
        return iv
    }()

    /// 生成朗读按钮（无音频时显示）
    private lazy var generateAudioButton: UIButton = {
        let b = UIButton(type: .system)
        b.setTitle("生成朗读", for: .normal)
        b.titleLabel?.font = .systemFont(ofSize: 15, weight: .medium)
        b.setTitleColor(.white, for: .normal)
        b.backgroundColor = UIColor(hex: "#3D2B1F")
        b.layer.cornerRadius = 8
        b.contentEdgeInsets = UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16)
        b.addTarget(self, action: #selector(generateAudioTapped), for: .touchUpInside)
        return b
    }()

    // MARK: - Init

    init(memoir: MemoirModel) {
        self.memoir = memoir
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .warmBackground
        setupNavigationBar()
        setupLayout()
        setupData()
        setupAudioPlayerCallbacks()
        setupNotifications()
        proseTextView.delegate = self
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // 从 Repository 重新加载最新数据，保持本地模型与持久化同步
        if let latest = MemoirRepository.shared.get(by: memoir.id) {
            memoir = latest
            setupData()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // 离开页面时停止播放
        if MemoirAudioPlayer.shared.state == .playing {
            MemoirAudioPlayer.shared.pause()
        }
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        MemoirAudioPlayer.shared.stop()
    }

    // MARK: - Navigation Bar

    private func setupNavigationBar() {
        title = "回忆录详情"
        navigationItem.largeTitleDisplayMode = .never

        let editButton = UIBarButtonItem(
            title: "编辑",
            style: .plain,
            target: self,
            action: #selector(editTapped)
        )
        editButton.tintColor = UIColor(hex: "#3D2B1F")
        navigationItem.rightBarButtonItem = editButton

        // 删除按钮（仅非编辑模式显示）
        let deleteButton = UIBarButtonItem(
            image: UIImage(systemName: "trash"),
            style: .plain,
            target: self,
            action: #selector(deleteTapped)
        )
        deleteButton.tintColor = UIColor.systemRed
        navigationItem.leftBarButtonItem = deleteButton
    }

    // MARK: - Layout

    private func setupLayout() {
        view.addSubview(scrollView)
        scrollView.addSubview(contentStack)

        [scrollView, contentStack].forEach { $0.translatesAutoresizingMaskIntoConstraints = false }

        // 信息卡片
        infoCard.addSubview(infoStack)
        infoStack.translatesAutoresizingMaskIntoConstraints = false

        // 音频卡片
        audioCard.addSubview(playButton)
        audioCard.addSubview(audioStatusLabel)
        audioCard.addSubview(progressSlider)
        audioCard.addSubview(timeDisplayLabel)
        audioCard.addSubview(synthesizingIndicator)
        audioCard.addSubview(generateAudioButton)
        [playButton, audioStatusLabel, progressSlider, timeDisplayLabel, synthesizingIndicator, generateAudioButton].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
        }

        // 添加到内容栈
        contentStack.addArrangedSubview(titleLabel)
        contentStack.addArrangedSubview(titleTextField)
        contentStack.addArrangedSubview(infoCard)
        contentStack.addArrangedSubview(audioCard)
        contentStack.addArrangedSubview(proseLabel)
        contentStack.addArrangedSubview(proseTextView)
        contentStack.addArrangedSubview(proseCharCountLabel)

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 20),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 20),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -20),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -20),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -40),

            // 信息卡片
            infoStack.topAnchor.constraint(equalTo: infoCard.topAnchor, constant: 14),
            infoStack.bottomAnchor.constraint(equalTo: infoCard.bottomAnchor, constant: -14),
            infoStack.leadingAnchor.constraint(equalTo: infoCard.leadingAnchor, constant: 14),
            infoStack.trailingAnchor.constraint(equalTo: infoCard.trailingAnchor, constant: -14),

            // 音频卡片
            audioCard.heightAnchor.constraint(greaterThanOrEqualToConstant: 80),
            playButton.leadingAnchor.constraint(equalTo: audioCard.leadingAnchor, constant: 16),
            playButton.centerYAnchor.constraint(equalTo: audioCard.topAnchor, constant: 30),
            playButton.widthAnchor.constraint(equalToConstant: 44),
            playButton.heightAnchor.constraint(equalToConstant: 44),

            audioStatusLabel.leadingAnchor.constraint(equalTo: playButton.trailingAnchor, constant: 10),
            audioStatusLabel.centerYAnchor.constraint(equalTo: playButton.centerYAnchor),
            audioStatusLabel.trailingAnchor.constraint(lessThanOrEqualTo: synthesizingIndicator.leadingAnchor, constant: -8),

            synthesizingIndicator.trailingAnchor.constraint(equalTo: audioCard.trailingAnchor, constant: -16),
            synthesizingIndicator.centerYAnchor.constraint(equalTo: playButton.centerYAnchor),

            generateAudioButton.centerXAnchor.constraint(equalTo: audioCard.centerXAnchor),
            generateAudioButton.centerYAnchor.constraint(equalTo: audioCard.centerYAnchor),

            progressSlider.topAnchor.constraint(equalTo: playButton.bottomAnchor, constant: 8),
            progressSlider.leadingAnchor.constraint(equalTo: audioCard.leadingAnchor, constant: 16),
            progressSlider.trailingAnchor.constraint(equalTo: audioCard.trailingAnchor, constant: -16),

            timeDisplayLabel.topAnchor.constraint(equalTo: progressSlider.bottomAnchor, constant: 4),
            timeDisplayLabel.trailingAnchor.constraint(equalTo: progressSlider.trailingAnchor),
            timeDisplayLabel.bottomAnchor.constraint(equalTo: audioCard.bottomAnchor, constant: -10),

            // 散文最小高度
            proseLabel.heightAnchor.constraint(greaterThanOrEqualToConstant: 100),
        ])
    }

    // MARK: - Data

    private func setupData() {
        titleLabel.text = memoir.title
        titleTextField.text = memoir.title
        proseLabel.text = memoir.prose
        proseTextView.text = memoir.prose

        timeLabel.text = "  \(memoir.timeDescription)"
        timeTextField.text = memoir.timeDescription
        locationLabel.text = "  \(memoir.location)"
        locationTextField.text = memoir.location

        // 人物标签
        peopleStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for person in memoir.keyPeople {
            peopleStack.addArrangedSubview(makePersonTag(person))
        }

        // 重建信息卡片
        rebuildInfoCard()

        // 音频状态
        updateAudioCardState()
    }

    private func rebuildInfoCard() {
        infoStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        let timeRow = makeInfoRow(icon: "calendar", label: "时间", valueLabel: timeLabel, editField: timeTextField)
        let locationRow = makeInfoRow(icon: "location.fill", label: "地点", valueLabel: locationLabel, editField: locationTextField)
        let peopleRow = makePeopleRow()

        infoStack.addArrangedSubview(timeRow)
        infoStack.addArrangedSubview(locationRow)
        infoStack.addArrangedSubview(peopleRow)
    }

    private func makeInfoRow(icon: String, label: String, valueLabel: UILabel, editField: UITextField) -> UIStackView {
        let iconView = UIImageView()
        if let img = UIImage(systemName: icon) {
            iconView.image = img.withRenderingMode(.alwaysTemplate)
            iconView.tintColor = UIColor(hex: "#6B5B4E")
        }
        iconView.widthAnchor.constraint(equalToConstant: 20).isActive = true
        iconView.heightAnchor.constraint(equalToConstant: 20).isActive = true

        let nameLabel = UILabel()
        nameLabel.text = label
        nameLabel.font = .systemFont(ofSize: 14, weight: .medium)
        nameLabel.textColor = UIColor(hex: "#9E8E7E")
        nameLabel.widthAnchor.constraint(equalToConstant: 36).isActive = true

        let stack = UIStackView(arrangedSubviews: [iconView, nameLabel, valueLabel, editField])
        stack.axis = .horizontal
        stack.spacing = 6
        stack.alignment = .center
        return stack
    }

    private func makePeopleRow() -> UIStackView {
        let iconView = UIImageView()
        if let img = UIImage(systemName: "person.2.fill") {
            iconView.image = img.withRenderingMode(.alwaysTemplate)
            iconView.tintColor = UIColor(hex: "#6B5B4E")
        }
        iconView.widthAnchor.constraint(equalToConstant: 20).isActive = true
        iconView.heightAnchor.constraint(equalToConstant: 20).isActive = true

        let nameLabel = UILabel()
        nameLabel.text = "人物"
        nameLabel.font = .systemFont(ofSize: 14, weight: .medium)
        nameLabel.textColor = UIColor(hex: "#9E8E7E")
        nameLabel.widthAnchor.constraint(equalToConstant: 36).isActive = true

        let container = UIStackView()
        container.axis = .vertical
        container.spacing = 4
        container.addArrangedSubview(peopleStack)
        container.addArrangedSubview(peopleTextField)

        let stack = UIStackView(arrangedSubviews: [iconView, nameLabel, container])
        stack.axis = .horizontal
        stack.spacing = 6
        stack.alignment = .top
        return stack
    }

    private func makePersonTag(_ name: String) -> UIView {
        let label = UILabel()
        label.text = name
        label.font = .systemFont(ofSize: 14, weight: .medium)
        label.textColor = UIColor(hex: "#3D2B1F")
        label.textAlignment = .center

        let container = UIView()
        container.backgroundColor = UIColor(hex: "#3D2B1F").withAlphaComponent(0.08)
        container.layer.cornerRadius = 12
        container.addSubview(label)
        label.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            label.topAnchor.constraint(equalTo: container.topAnchor, constant: 5),
            label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -5),
            label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 12),
            label.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -12),
        ])
        return container
    }

    // MARK: - 音频播放卡片状态

    private func updateAudioCardState() {
        let hasAudio = memoir.audioFileName != nil
        let hasAudioFile = MemoirTTSService.shared.getAudioURL(for: memoir.id) != nil
        let canPlay = hasAudioFile

        if canPlay {
            // 有音频文件：显示播放控件
            playButton.isHidden = false
            audioStatusLabel.isHidden = false
            progressSlider.isHidden = false
            timeDisplayLabel.isHidden = false
            generateAudioButton.isHidden = true

            audioStatusLabel.text = "点击播放回忆录朗读"
            playButton.setImage(UIImage(systemName: "play.circle.fill"), for: .normal)
        } else if memoir.speakerId != nil || VoiceCloneService.shared.currentSpeakerId != nil {
            // 有 speaker_id 但还没有合成：显示"生成朗读"按钮
            playButton.isHidden = true
            audioStatusLabel.isHidden = true
            progressSlider.isHidden = true
            timeDisplayLabel.isHidden = true
            generateAudioButton.isHidden = false
        } else {
            // 没有声音复刻：显示降级提示
            playButton.isHidden = true
            audioStatusLabel.isHidden = false
            progressSlider.isHidden = true
            timeDisplayLabel.isHidden = true
            generateAudioButton.isHidden = false

            audioStatusLabel.text = "完成声音复刻后可生成朗读"
            generateAudioButton.setTitle("用系统语音朗读", for: .normal)
        }
    }

    // MARK: - 通知监听

    /// 监听后台事件：音频合成完成
    private func setupNotifications() {
        // 音频合成完成通知（来自 MemoirFlowManager 或手动合成）
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleMemoirAudioReady(_:)),
            name: .djMemoirAudioReady,
            object: nil
        )
    }

    @objc private func handleMemoirAudioReady(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let memoirId = userInfo["memoirId"] as? String,
              memoirId == memoir.id else { return }
        // 从 Repository 重新加载，更新本地模型和 UI
        reloadFromRepository()
    }

    /// 从 Repository 重新加载回忆录数据并刷新 UI
    private func reloadFromRepository() {
        guard let latest = MemoirRepository.shared.get(by: memoir.id) else { return }
        memoir = latest
        updateAudioCardState()
    }

    // MARK: - 音频播放回调

    private func setupAudioPlayerCallbacks() {
        MemoirAudioPlayer.shared.onStateChanged = { [weak self] state in
            DispatchQueue.main.async {
                self?.handlePlaybackStateChanged(state)
            }
        }

        MemoirAudioPlayer.shared.onProgressChanged = { [weak self] current, total in
            DispatchQueue.main.async {
                self?.handleProgressChanged(current: current, total: total)
            }
        }

        MemoirAudioPlayer.shared.onPlaybackFinished = { [weak self] in
            DispatchQueue.main.async {
                self?.isPlaying = false
                self?.playButton.setImage(UIImage(systemName: "play.circle.fill"), for: .normal)
                self?.audioStatusLabel.text = "播放完毕"
            }
        }
    }

    private func handlePlaybackStateChanged(_ state: MemoirAudioPlayer.PlaybackState) {
        switch state {
        case .playing:
            isPlaying = true
            let config = UIImage.SymbolConfiguration(pointSize: 28, weight: .medium)
            playButton.setImage(UIImage(systemName: "pause.circle.fill", withConfiguration: config), for: .normal)
            audioStatusLabel.text = "正在朗读..."
        case .paused:
            isPlaying = false
            let config = UIImage.SymbolConfiguration(pointSize: 28, weight: .medium)
            playButton.setImage(UIImage(systemName: "play.circle.fill", withConfiguration: config), for: .normal)
            audioStatusLabel.text = "已暂停"
        case .idle, .ended, .loading:
            isPlaying = false
            let config = UIImage.SymbolConfiguration(pointSize: 28, weight: .medium)
            playButton.setImage(UIImage(systemName: "play.circle.fill", withConfiguration: config), for: .normal)
            if state == .idle {
                audioStatusLabel.text = "点击播放回忆录朗读"
                progressSlider.value = 0
                timeDisplayLabel.text = "0:00 / 0:00"
            }
        }
    }

    private func handleProgressChanged(current: TimeInterval, total: TimeInterval) {
        guard total > 0 else { return }
        progressSlider.value = Float(current / total)
        timeDisplayLabel.text = "\(MemoirAudioPlayer.formatTime(current)) / \(MemoirAudioPlayer.formatTime(total))"
    }

    // MARK: - Actions

    @objc private func playTapped() {
        if isPlaying {
            MemoirAudioPlayer.shared.pause()
        } else {
            // 优先播放本地文件，降级用系统 TTS
            if let audioURL = MemoirTTSService.shared.getAudioURL(for: memoir.id) {
                MemoirAudioPlayer.shared.play(audioURL: audioURL, memoirId: memoir.id)
            } else {
                // 降级：系统 TTS 朗读
                MemoirAudioPlayer.shared.playWithSystemTTS(text: memoir.prose, memoirId: memoir.id)
            }
        }
    }

    @objc private func sliderChanged() {
        guard MemoirAudioPlayer.shared.duration > 0 else { return }
        let targetTime = TimeInterval(progressSlider.value) * MemoirAudioPlayer.shared.duration
        MemoirAudioPlayer.shared.seek(to: targetTime)
    }

    @objc private func generateAudioTapped() {
        // 如果有 speaker_id，用声音复刻 TTS；否则降级为系统 TTS
        if memoir.speakerId != nil || VoiceCloneService.shared.currentSpeakerId != nil {
            generateAudioWithClone()
        } else {
            // 降级：直接用系统 TTS 朗读
            MemoirAudioPlayer.shared.playWithSystemTTS(text: memoir.prose, memoirId: memoir.id)
        }
    }

    private func generateAudioWithClone() {
        synthesizingIndicator.startAnimating()
        generateAudioButton.isHidden = true
        audioStatusLabel.isHidden = false
        audioStatusLabel.text = "正在合成语音..."

        MemoirTTSService.shared.synthesize(memoir: memoir) { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.synthesizingIndicator.stopAnimating()

                switch result {
                case .success(let audioURL):
                    // 更新模型，保存音频文件名和 speakerId
                    self.memoir.audioFileName = audioURL.lastPathComponent
                    if self.memoir.speakerId == nil, let sid = VoiceCloneService.shared.currentSpeakerId {
                        self.memoir.speakerId = sid
                    }
                    MemoirRepository.shared.save(self.memoir)
                    self.updateAudioCardState()
                    self.showToast("语音合成完成", type: .success)

                    // 自动播放
                    MemoirAudioPlayer.shared.play(audioURL: audioURL, memoirId: self.memoir.id)

                case .failure(let error):
                    DDLogError("[MemoirDetail] 语音合成失败: \(error.localizedDescription)")
                    self.audioStatusLabel.text = "合成失败，使用系统语音"
                    self.showToast(error.localizedDescription, type: .error)

                    // 降级到系统 TTS
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                        MemoirAudioPlayer.shared.playWithSystemTTS(text: self.memoir.prose, memoirId: self.memoir.id)
                    }
                }
            }
        }
    }

    // MARK: - 编辑模式

    @objc private func deleteTapped() {
        let alert = UIAlertController(
            title: "删除回忆录",
            message: "确定要删除「\(memoir.title)」吗？此操作无法撤销。",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "取消", style: .cancel))
        alert.addAction(UIAlertAction(title: "删除", style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            // 停止播放
            if MemoirAudioPlayer.shared.state == .playing {
                MemoirAudioPlayer.shared.stop()
            }
            // 删除数据
            MemoirRepository.shared.delete(id: self.memoir.id)
            // 返回上一页
            self.navigationController?.popViewController(animated: true)
        })
        present(alert, animated: true)
    }

    @objc private func editTapped() {
        if isEditingMode {
            saveEditing()
        } else {
            enterEditingMode()
        }
    }

    private func enterEditingMode() {
        isEditingMode = true
        navigationItem.rightBarButtonItem?.title = "保存"
        navigationItem.leftBarButtonItem = UIBarButtonItem(
            title: "取消",
            style: .plain,
            target: self,
            action: #selector(cancelEditingTapped)
        )
        navigationItem.leftBarButtonItem?.tintColor = UIColor(hex: "#6B5B4E")

        // 切换到编辑控件
        titleLabel.isHidden = true
        titleTextField.isHidden = false
        titleTextField.text = memoir.title

        timeLabel.isHidden = true
        timeTextField.isHidden = false
        timeTextField.text = memoir.timeDescription

        locationLabel.isHidden = true
        locationTextField.isHidden = false
        locationTextField.text = memoir.location

        peopleStack.isHidden = true
        peopleTextField.isHidden = false
        peopleTextField.text = memoir.keyPeople.joined(separator: "，")

        proseLabel.isHidden = true
        proseTextView.isHidden = false
        proseTextView.text = memoir.prose
        proseCharCountLabel.isHidden = false
        updateProseCharCount()
    }

    /// 取消编辑：检测是否有修改，有则弹确认框
    @objc private func cancelEditingTapped() {
        let hasChanges = titleTextField.text?.trimmingCharacters(in: .whitespacesAndNewlines) != memoir.title
            || timeTextField.text?.trimmingCharacters(in: .whitespacesAndNewlines) != memoir.timeDescription
            || locationTextField.text?.trimmingCharacters(in: .whitespacesAndNewlines) != memoir.location
            || proseTextView.text?.trimmingCharacters(in: .whitespacesAndNewlines) != memoir.prose
            || peopleTextField.text != memoir.keyPeople.joined(separator: "，")

        if hasChanges {
            let alert = UIAlertController(
                title: "放弃修改？",
                message: "你有未保存的修改，确定要放弃吗？",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "放弃", style: .destructive) { [weak self] _ in
                self?.discardEditing()
            })
            alert.addAction(UIAlertAction(title: "继续编辑", style: .cancel))
            present(alert, animated: true)
        } else {
            discardEditing()
        }
    }

    /// 丢弃编辑，恢复展示模式
    private func discardEditing() {
        isEditingMode = false
        navigationItem.rightBarButtonItem?.title = "编辑"
        // 恢复删除按钮
        let deleteButton = UIBarButtonItem(
            image: UIImage(systemName: "trash"),
            style: .plain,
            target: self,
            action: #selector(deleteTapped)
        )
        deleteButton.tintColor = .systemRed
        navigationItem.leftBarButtonItem = deleteButton

        // 不更新模型，恢复展示
        titleLabel.isHidden = false
        titleTextField.isHidden = true
        timeLabel.isHidden = false
        timeTextField.isHidden = true
        locationLabel.isHidden = false
        locationTextField.isHidden = true
        peopleStack.isHidden = false
        peopleTextField.isHidden = true
        proseLabel.isHidden = false
        proseTextView.isHidden = true
        proseCharCountLabel.isHidden = true
    }

    private func saveEditing() {
        // 校验：标题和正文不能为空
        let newTitle = titleTextField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let newProse = proseTextView.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

        if newTitle.isEmpty {
            showToast("标题不能为空", type: .error)
            return
        }
        if newProse.isEmpty {
            showToast("正文不能为空", type: .error)
            return
        }

        isEditingMode = false
        navigationItem.rightBarButtonItem?.title = "编辑"

        // 恢复删除按钮
        let deleteButton = UIBarButtonItem(
            image: UIImage(systemName: "trash"),
            style: .plain,
            target: self,
            action: #selector(deleteTapped)
        )
        deleteButton.tintColor = .systemRed
        navigationItem.leftBarButtonItem = deleteButton

        // 检测散文正文是否被修改
        let proseChanged = memoir.prose != newProse

        // 更新模型
        memoir.title = newTitle
        memoir.timeDescription = timeTextField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? memoir.timeDescription
        memoir.location = locationTextField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? memoir.location
        memoir.prose = newProse
        memoir.updatedAt = Date()

        // 解析人物（支持中英文逗号、顿号分隔）
        if let peopleText = peopleTextField.text {
            let separators = CharacterSet(charactersIn: "，,、 ")
            memoir.keyPeople = peopleText
                .components(separatedBy: separators)
                .map { $0.trimmingCharacters(in: .whitespaces) }
                .filter { !$0.isEmpty }
        }

        // 如果散文正文被修改，之前的合成音频已过期，需要删除
        if proseChanged && memoir.audioFileName != nil {
            MemoirTTSService.shared.deleteAudio(for: memoir.id)
            memoir.audioFileName = nil
            DDLogInfo("[MemoirDetail] 散文已修改，旧音频已删除")
        }

        // 保存
        MemoirRepository.shared.save(memoir)
        showToast("已保存", type: .success)

        // 切换回展示模式
        titleLabel.isHidden = false
        titleTextField.isHidden = true
        timeLabel.isHidden = false
        timeTextField.isHidden = true
        locationLabel.isHidden = false
        locationTextField.isHidden = true
        peopleStack.isHidden = false
        peopleTextField.isHidden = true
        proseLabel.isHidden = false
        proseTextView.isHidden = true
        proseCharCountLabel.isHidden = true

        setupData()
    }

    // MARK: - 散文字数

    private func updateProseCharCount() {
        let count = proseTextView.text.count
        proseCharCountLabel.text = "\(count) 字"
    }
}

// MARK: - UITextViewDelegate

extension MemoirDetailViewController: UITextViewDelegate {
    func textViewDidChange(_ textView: UITextView) {
        updateProseCharCount()
    }
}

