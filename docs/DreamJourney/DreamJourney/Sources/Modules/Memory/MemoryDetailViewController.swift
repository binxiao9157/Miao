import UIKit
import AVFoundation

// MARK: - 回忆详情页访问模式
enum MemoryDetailViewMode {
    case host    // 主态：回忆作者本人查看
    case guest   // 客态：亲属查看公开回忆
}

// MARK: - MemoryDetailViewController：回忆详情页（参考拍立得视觉）
final class MemoryDetailViewController: UIViewController {

    // MARK: - Properties
    private var memory: MemoryModel
    private let viewMode: MemoryDetailViewMode
    private var isPlaying = false
    /// 原始录音播放器（lazy 初始化，文件存在时才创建）
    private var audioPlayer: AVAudioPlayer?
    /// 当前录音文件 URL（来自 MemoirRepository.recordingsDirectory/{sessionId}.m4a）
    private var recordingURL: URL?

    // MARK: - Init
    init(memory: MemoryModel, viewMode: MemoryDetailViewMode = .host) {
        self.memory = memory
        self.viewMode = viewMode
        super.init(nibName: nil, bundle: nil)
        // push 进入时隐藏底部 TabBar；返回足迹页时自动恢复
        hidesBottomBarWhenPushed = true
    }

    required init?(coder: NSCoder) { fatalError() }

    // MARK: - 滚动容器
    private lazy var scrollView: UIScrollView = {
        let sv = UIScrollView()
        sv.showsVerticalScrollIndicator = false
        sv.contentInset = UIEdgeInsets(top: 0, left: 0, bottom: 24, right: 0)
        return sv
    }()

    private lazy var contentStack: UIStackView = {
        let s = UIStackView()
        s.axis = .vertical
        s.spacing = 18
        return s
    }()

    // MARK: - 1. 私密横幅（仅私密回忆显示）
    private lazy var privacyBanner: UIView = {
        let v = UIView()
        v.backgroundColor = UIColor(hex: "#fff7e6")
        v.layer.cornerRadius = 10
        v.isHidden = true
        return v
    }()

    private let privacyLabel: UILabel = {
        let l = UILabel()
        l.text = "🔒 这是一段私密回忆，仅您自己可见"
        l.font = .systemFont(ofSize: 14, weight: .medium)
        l.textColor = UIColor(hex: "#d48806")
        l.numberOfLines = 0
        return l
    }()

    // MARK: - 2. 拍立得照片横滑卡
    private lazy var photoScrollView: UIScrollView = {
        let sv = UIScrollView()
        sv.showsHorizontalScrollIndicator = false
        sv.clipsToBounds = false
        sv.decelerationRate = .fast
        return sv
    }()

    private lazy var photoStack: UIStackView = {
        let s = UIStackView()
        s.axis = .horizontal
        s.spacing = 14
        s.alignment = .center
        return s
    }()

    // MARK: - 3. 橙色音频回放卡
    private lazy var audioCard: UIView = {
        let v = UIView()
        v.backgroundColor = .white
        v.layer.cornerRadius = 14
        v.layer.shadowColor = UIColor.black.cgColor
        v.layer.shadowOpacity = 0.06
        v.layer.shadowOffset = CGSize(width: 0, height: 2)
        v.layer.shadowRadius = 6
        return v
    }()

    private lazy var audioPlayButton: UIButton = {
        let b = UIButton(type: .system)
        b.backgroundColor = .warmAccent
        b.tintColor = .white
        b.layer.cornerRadius = 24
        let cfg = UIImage.SymbolConfiguration(pointSize: 18, weight: .bold)
        b.setImage(UIImage(systemName: "play.fill", withConfiguration: cfg), for: .normal)
        b.addTarget(self, action: #selector(audioTapped), for: .touchUpInside)
        return b
    }()

    private let audioTitleLabel: UILabel = {
        let l = UILabel()
        l.text = "原始录音回放"
        l.font = .systemFont(ofSize: 15, weight: .semibold)
        l.textColor = TGColors.textPrimary
        return l
    }()

    private let audioDurationLabel: UILabel = {
        let l = UILabel()
        l.text = "02:45"
        l.font = .systemFont(ofSize: 12)
        l.textColor = TGColors.textSecondary
        return l
    }()

    private lazy var waveformView: AudioWaveformView = AudioWaveformView()

    // MARK: - 4. 引文区
    private let quoteLabel: UILabel = {
        let l = UILabel()
        l.font = .systemFont(ofSize: 16)
        l.textColor = TGColors.textPrimary
        l.numberOfLines = 0
        return l
    }()

    // MARK: - 5. 互动行（点赞 + 评论数）
    private lazy var interactionRow: UIStackView = {
        let s = UIStackView()
        s.axis = .horizontal
        s.spacing = 24
        s.alignment = .center
        return s
    }()

    private lazy var likeButton: UIButton = {
        let b = UIButton(type: .system)
        b.titleLabel?.font = .systemFont(ofSize: 14, weight: .medium)
        b.tintColor = TGColors.textSecondary
        b.contentHorizontalAlignment = .leading
        // 详情页互动行仅展示数据，不响应点击
        b.isUserInteractionEnabled = false
        return b
    }()

    private lazy var commentCountButton: UIButton = {
        let b = UIButton(type: .system)
        b.titleLabel?.font = .systemFont(ofSize: 14, weight: .medium)
        b.tintColor = TGColors.textSecondary
        let cfg = UIImage.SymbolConfiguration(pointSize: 18, weight: .regular)
        b.setImage(UIImage(systemName: "bubble.right", withConfiguration: cfg), for: .normal)
        b.imageEdgeInsets = UIEdgeInsets(top: 0, left: 0, bottom: 0, right: 6)
        b.isUserInteractionEnabled = false
        return b
    }()

    private let interactionDivider: UIView = {
        let v = UIView()
        v.backgroundColor = UIColor.warmDivider
        return v
    }()

    // MARK: - 6. 评论区（气泡风格）
    private lazy var commentsStack: UIStackView = {
        let s = UIStackView()
        s.axis = .vertical
        s.spacing = 12
        return s
    }()

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        print("[MemoirSync] MemoryDetailVC.viewDidLoad: id=\(memory.id), title=\(memory.title), subtitle=\(memory.subtitle), location=\(memory.location), year=\(memory.year), month=\(memory.month), images=\(memory.imageNames.count), audio=\(memory.audioName ?? "nil"), authorId=\(memory.authorId), viewMode=\(viewMode)")
        view.backgroundColor = .warmBackground
        setupNavigationBar()
        setupLayout()
        setupData()
        configureForViewMode()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.navigationBar.prefersLargeTitles = false
        // 详情页从足迹 host 模式 push 进入，host 隐藏了 navigationBar，
        // 这里需恢复显示，确保返回按钮可用
        navigationController?.setNavigationBarHidden(false, animated: animated)
    }

    // MARK: - NavigationBar
    private func setupNavigationBar() {
        // 主客态差异：
        //   host  → 右上「编辑」按钮，可改标题/地点/正文/私密；左侧保持系统默认返回按钮
        //   guest → 不展示编辑；右侧 like + 评论
        let cfg = UIImage.SymbolConfiguration(pointSize: 18, weight: .regular)
        // 左侧统一使用系统默认返回（不显式覆盖 leftBarButtonItem，避免遮挡返回箭头）
        navigationItem.leftBarButtonItem = nil
        switch viewMode {
        case .host:
            let editBtn = UIBarButtonItem(
                title: "编辑", style: .plain, target: self, action: #selector(editTapped))
            editBtn.tintColor = .warmAccent
            navigationItem.rightBarButtonItem = editBtn
        case .guest:
            let likeBtn = UIBarButtonItem(
                image: UIImage(systemName: "heart", withConfiguration: cfg),
                style: .plain, target: self, action: #selector(likeTapped))
            let commentBtn = UIBarButtonItem(
                image: UIImage(systemName: "bubble.right", withConfiguration: cfg),
                style: .plain, target: self, action: #selector(navCommentTapped))
            likeBtn.tintColor = TGColors.textPrimary
            commentBtn.tintColor = TGColors.textPrimary
            navigationItem.rightBarButtonItems = [commentBtn, likeBtn]
        }
        title = ""
    }

    // MARK: - Configure for ViewMode
    private func configureForViewMode() {
        switch viewMode {
        case .host:
            privacyBanner.isHidden = !memory.isPrivate
        case .guest:
            privacyBanner.isHidden = true
        }
    }

    // MARK: - Setup Layout
    private func setupLayout() {
        view.addSubview(scrollView)
        scrollView.addSubview(contentStack)
        [scrollView, contentStack].forEach { $0.translatesAutoresizingMaskIntoConstraints = false }

        // 隐私横幅
        privacyBanner.addSubview(privacyLabel)
        privacyLabel.translatesAutoresizingMaskIntoConstraints = false

        // 拍立得照片
        photoScrollView.addSubview(photoStack)
        photoStack.translatesAutoresizingMaskIntoConstraints = false

        // 音频卡
        [audioPlayButton, audioTitleLabel, audioDurationLabel, waveformView].forEach {
            audioCard.addSubview($0)
            $0.translatesAutoresizingMaskIntoConstraints = false
        }

        // 互动行
        interactionRow.addArrangedSubview(likeButton)
        interactionRow.addArrangedSubview(commentCountButton)
        interactionRow.addArrangedSubview(UIView())  // spacer

        // 装入主栈
        contentStack.addArrangedSubview(privacyBanner)
        contentStack.addArrangedSubview(photoScrollView)
        contentStack.addArrangedSubview(audioCard)
        contentStack.addArrangedSubview(quoteLabel)
        contentStack.addArrangedSubview(interactionRow)
        contentStack.addArrangedSubview(interactionDivider)
        contentStack.addArrangedSubview(commentsStack)
        interactionDivider.translatesAutoresizingMaskIntoConstraints = false

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor, constant: 12),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor, constant: 16),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor, constant: -16),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor, constant: -16),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor, constant: -32),

            // 隐私横幅
            privacyLabel.topAnchor.constraint(equalTo: privacyBanner.topAnchor, constant: 10),
            privacyLabel.bottomAnchor.constraint(equalTo: privacyBanner.bottomAnchor, constant: -10),
            privacyLabel.leadingAnchor.constraint(equalTo: privacyBanner.leadingAnchor, constant: 12),
            privacyLabel.trailingAnchor.constraint(equalTo: privacyBanner.trailingAnchor, constant: -12),

            // 拍立得照片
            photoScrollView.heightAnchor.constraint(equalToConstant: 280),
            photoStack.topAnchor.constraint(equalTo: photoScrollView.topAnchor),
            photoStack.bottomAnchor.constraint(equalTo: photoScrollView.bottomAnchor),
            photoStack.leadingAnchor.constraint(equalTo: photoScrollView.leadingAnchor),
            photoStack.trailingAnchor.constraint(equalTo: photoScrollView.trailingAnchor),
            photoStack.heightAnchor.constraint(equalTo: photoScrollView.heightAnchor),

            // 音频卡
            audioCard.heightAnchor.constraint(equalToConstant: 72),
            audioPlayButton.leadingAnchor.constraint(equalTo: audioCard.leadingAnchor, constant: 14),
            audioPlayButton.centerYAnchor.constraint(equalTo: audioCard.centerYAnchor),
            audioPlayButton.widthAnchor.constraint(equalToConstant: 48),
            audioPlayButton.heightAnchor.constraint(equalToConstant: 48),
            audioTitleLabel.topAnchor.constraint(equalTo: audioCard.topAnchor, constant: 16),
            audioTitleLabel.leadingAnchor.constraint(equalTo: audioPlayButton.trailingAnchor, constant: 12),
            audioDurationLabel.centerYAnchor.constraint(equalTo: audioTitleLabel.centerYAnchor),
            audioDurationLabel.trailingAnchor.constraint(equalTo: audioCard.trailingAnchor, constant: -14),
            waveformView.leadingAnchor.constraint(equalTo: audioTitleLabel.leadingAnchor),
            waveformView.trailingAnchor.constraint(equalTo: audioDurationLabel.trailingAnchor),
            waveformView.topAnchor.constraint(equalTo: audioTitleLabel.bottomAnchor, constant: 6),
            waveformView.heightAnchor.constraint(equalToConstant: 18),

            // 分割线
            interactionDivider.heightAnchor.constraint(equalToConstant: 0.5),
        ])

        // 互动按钮内边距
        likeButton.contentEdgeInsets = .zero
        commentCountButton.contentEdgeInsets = .zero
    }

    // MARK: - Setup Data
    private func setupData() {
        buildPolaroidPhotos()
        buildAudioCard()
        buildQuote()
        updateLikeButton()
        updateCommentCount()
        buildComments()
    }

    // MARK: - 拍立得照片卡
    /// 单张：占满屏幕宽度（与 contentStack 一致），photoScrollView 不可横滑；
    /// 多张：保持原有卡片宽度（屏幕 - 80），允许横滑。
    /// 用户未上传图片时，使用一张内置默认图（按 memory.id hash 选 4 张之一）。
    private func buildPolaroidPhotos() {
        photoStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let caption = "\(memory.location) — \(memory.year)年\(memory.month)月"

        // 解析展示用的图片：优先用户上传，否则使用内置默认图
        let displayImages: [UIImage] = {
            let userImgs = memory.imageNames.compactMap { UIImage(named: $0) }
            if !userImgs.isEmpty { return userImgs }
            let idx = abs(memory.id.hashValue) % 4
            if let img = UIImage(named: "default_memory_\(idx + 1)") { return [img] }
            return []
        }()

        let isSingle = displayImages.count <= 1
        let fullWidth: CGFloat = UIScreen.main.bounds.width - 32
        let multiWidth: CGFloat = UIScreen.main.bounds.width - 80
        let cardWidth: CGFloat = isSingle ? fullWidth : multiWidth

        photoScrollView.isScrollEnabled = !isSingle

        for (idx, img) in displayImages.enumerated() {
            let cap = idx == 0 ? caption : "\(memory.location) — \(memory.year)年"
            let card = makePolaroid(image: img, caption: cap, cardWidth: cardWidth)
            photoStack.addArrangedSubview(card)
        }
    }

    private func makePolaroid(image: UIImage?, caption: String, cardWidth: CGFloat) -> UIView {
        let card = UIView()
        card.backgroundColor = .white
        card.layer.cornerRadius = 6
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.12
        card.layer.shadowOffset = CGSize(width: 0, height: 4)
        card.layer.shadowRadius = 8
        card.translatesAutoresizingMaskIntoConstraints = false

        let imgView = UIImageView()
        imgView.image = image
        imgView.contentMode = .scaleAspectFill
        imgView.clipsToBounds = true
        imgView.layer.cornerRadius = 4
        imgView.backgroundColor = TGColors.headerFallback.withAlphaComponent(0.12)

        let captionLabel = UILabel()
        captionLabel.text = caption
        captionLabel.font = .italicSystemFont(ofSize: 13)
        captionLabel.textColor = TGColors.textPrimary
        captionLabel.textAlignment = .center

        card.addSubview(imgView)
        card.addSubview(captionLabel)
        [imgView, captionLabel].forEach { $0.translatesAutoresizingMaskIntoConstraints = false }

        NSLayoutConstraint.activate([
            card.widthAnchor.constraint(equalToConstant: cardWidth),
            imgView.topAnchor.constraint(equalTo: card.topAnchor, constant: 12),
            imgView.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            imgView.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
            imgView.heightAnchor.constraint(equalTo: imgView.widthAnchor, multiplier: 0.78),

            captionLabel.topAnchor.constraint(equalTo: imgView.bottomAnchor, constant: 14),
            captionLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            captionLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
            captionLabel.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -16),
        ])
        return card
    }

    // MARK: - 音频卡内容（按数据显隐）
    private func buildAudioCard() {
        // 1) 优先使用原始对话录音：sessionId 存在 audioName，文件保存在 MemoirRepository.recordingsDirectory
        if let sessionId = memory.audioName,
           !sessionId.isEmpty,
           let url = MemoirRepository.shared.getRecordingURL(sessionId: sessionId) {
            recordingURL = url
            audioCard.isHidden = false
            audioTitleLabel.text = "原始录音回放"
            audioDurationLabel.text = formatDuration(of: url)
            return
        }
        // 2) 无录音文件 → 隐藏整个音频卡
        recordingURL = nil
        audioCard.isHidden = true
    }

    /// 读取音频文件时长，格式化为 mm:ss
    private func formatDuration(of url: URL) -> String {
        let asset = AVURLAsset(url: url)
        let seconds = Int(CMTimeGetSeconds(asset.duration).rounded())
        guard seconds > 0 else { return "--:--" }
        return String(format: "%02d:%02d", seconds / 60, seconds % 60)
    }

    // MARK: - 正文（完整生成内容）
    private func buildQuote() {
        // 优先级：MemoryModel.fullContent（已持久化到本地）
        //       → MemoirRepository.prose（兼容老数据/未桥接情形）
        //       → subtitle（mock 数据兜底）
        //       → title
        let raw: String
        if let content = memory.fullContent, !content.isEmpty {
            raw = content
        } else if let prose = MemoirRepository.shared.get(by: memory.id)?.prose, !prose.isEmpty {
            raw = prose
        } else if !memory.subtitle.isEmpty {
            raw = memory.subtitle
        } else {
            raw = memory.title
        }
        quoteLabel.text = raw
        // 正文样式：常规字号 + 行距，去掉引号包裹
        let attr = NSMutableAttributedString(string: raw)
        let style = NSMutableParagraphStyle()
        style.lineSpacing = 8
        style.paragraphSpacing = 6
        attr.addAttribute(.paragraphStyle, value: style, range: NSRange(location: 0, length: attr.length))
        quoteLabel.attributedText = attr
    }

    // MARK: - 互动数
    private func updateLikeButton() {
        let userId = UserManager.shared.currentUser?.id ?? ""
        let isLiked = memory.isLikedBy(userId: userId)
        let cfg = UIImage.SymbolConfiguration(pointSize: 18, weight: .regular)
        let img = UIImage(systemName: isLiked ? "heart.fill" : "heart", withConfiguration: cfg)
        likeButton.setImage(img, for: .normal)
        likeButton.tintColor = isLiked ? .warmAccent : TGColors.textSecondary
        likeButton.setTitle("  \(memory.likes.count)", for: .normal)
        likeButton.setTitleColor(TGColors.textSecondary, for: .normal)
    }

    private func updateCommentCount() {
        commentCountButton.setTitle("  \(memory.comments.count)", for: .normal)
        commentCountButton.setTitleColor(TGColors.textSecondary, for: .normal)
    }

    // MARK: - 颜色调色板（评论头像背景）
    private func colorForName(_ name: String) -> UIColor {
        let palette: [UIColor] = [
            UIColor(hex: "#E879A0"),  // 粉
            UIColor(hex: "#A88B6B"),  // 棕
            UIColor(hex: "#7B7B82"),  // 灰
            UIColor(hex: "#D49B6F"),  // 暖橙
        ]
        let idx = abs(name.hashValue) % palette.count
        return palette[idx]
    }

    // MARK: - 评论气泡
    private func buildComments() {
        commentsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        // 把补充也合并到评论区（简化）
        let supplementsAsComments: [CommentModel] = memory.supplements.map {
            CommentModel(authorId: $0.authorId, authorName: $0.authorName, content: $0.content)
        }
        let all = supplementsAsComments + memory.comments
        if all.isEmpty {
            // 无评论：完全隐藏评论模块（含分割线、评论数按钮），保持页面干净
            commentsStack.isHidden = true
            interactionDivider.isHidden = true
            commentCountButton.isHidden = true
        } else {
            commentsStack.isHidden = false
            interactionDivider.isHidden = false
            commentCountButton.isHidden = false
            for c in all {
                commentsStack.addArrangedSubview(makeCommentBubble(c))
            }
        }
    }

    private func makeCommentBubble(_ comment: CommentModel) -> UIView {
        let row = UIView()

        let avatar = UIView()
        avatar.backgroundColor = colorForName(comment.authorName)
        avatar.layer.cornerRadius = 18
        avatar.clipsToBounds = true
        let initial = UILabel()
        initial.text = String(comment.authorName.prefix(1))
        initial.font = .boldSystemFont(ofSize: 14)
        initial.textColor = .white
        initial.textAlignment = .center
        initial.translatesAutoresizingMaskIntoConstraints = false
        avatar.addSubview(initial)

        let nameLabel = UILabel()
        nameLabel.text = comment.authorName
        nameLabel.font = .systemFont(ofSize: 11)
        nameLabel.textColor = TGColors.textSecondary
        nameLabel.textAlignment = .center

        let bubble = UIView()
        bubble.backgroundColor = .white
        bubble.layer.cornerRadius = 12
        bubble.layer.shadowColor = UIColor.black.cgColor
        bubble.layer.shadowOpacity = 0.04
        bubble.layer.shadowOffset = CGSize(width: 0, height: 1)
        bubble.layer.shadowRadius = 3

        let content = UILabel()
        content.text = comment.content
        content.font = .systemFont(ofSize: 14)
        content.textColor = TGColors.textPrimary
        content.numberOfLines = 0

        bubble.addSubview(content)
        [avatar, nameLabel, bubble, initial, content].forEach { $0.translatesAutoresizingMaskIntoConstraints = false }
        row.addSubview(avatar)
        row.addSubview(nameLabel)
        row.addSubview(bubble)

        NSLayoutConstraint.activate([
            avatar.topAnchor.constraint(equalTo: row.topAnchor),
            avatar.leadingAnchor.constraint(equalTo: row.leadingAnchor),
            avatar.widthAnchor.constraint(equalToConstant: 36),
            avatar.heightAnchor.constraint(equalToConstant: 36),
            initial.centerXAnchor.constraint(equalTo: avatar.centerXAnchor),
            initial.centerYAnchor.constraint(equalTo: avatar.centerYAnchor),

            nameLabel.topAnchor.constraint(equalTo: avatar.bottomAnchor, constant: 2),
            nameLabel.centerXAnchor.constraint(equalTo: avatar.centerXAnchor),

            bubble.topAnchor.constraint(equalTo: row.topAnchor),
            bubble.leadingAnchor.constraint(equalTo: avatar.trailingAnchor, constant: 10),
            bubble.trailingAnchor.constraint(equalTo: row.trailingAnchor),
            bubble.bottomAnchor.constraint(equalTo: row.bottomAnchor),

            content.topAnchor.constraint(equalTo: bubble.topAnchor, constant: 12),
            content.bottomAnchor.constraint(equalTo: bubble.bottomAnchor, constant: -12),
            content.leadingAnchor.constraint(equalTo: bubble.leadingAnchor, constant: 14),
            content.trailingAnchor.constraint(equalTo: bubble.trailingAnchor, constant: -14),
        ])
        return row
    }

    // MARK: - Actions
    @objc private func likeTapped() {
        let userId = UserManager.shared.currentUser?.id ?? "unknown"
        let userName = UserManager.shared.currentUser?.nickname ?? "我"
        let didLike = MemoryRepository.shared.toggleLike(userId: userId, userName: userName, on: memory.id)
        if let updated = MemoryRepository.shared.get(by: memory.id) { memory = updated }
        updateLikeButton()
        showToast(didLike ? "已点赞 ❤️" : "取消点赞", type: didLike ? .success : .info)
    }

    @objc private func audioTapped() {
        guard let url = recordingURL else { return }
        // 懒加载播放器
        if audioPlayer == nil {
            do {
                try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
                try AVAudioSession.sharedInstance().setActive(true)
                audioPlayer = try AVAudioPlayer(contentsOf: url)
                audioPlayer?.delegate = self
                audioPlayer?.prepareToPlay()
            } catch {
                showToast("录音加载失败", type: .error)
                return
            }
        }
        guard let player = audioPlayer else { return }
        if player.isPlaying {
            player.pause()
            isPlaying = false
        } else {
            player.play()
            isPlaying = true
        }
        let cfg = UIImage.SymbolConfiguration(pointSize: 18, weight: .bold)
        audioPlayButton.setImage(UIImage(systemName: isPlaying ? "pause.fill" : "play.fill", withConfiguration: cfg), for: .normal)
        audioTitleLabel.text = isPlaying ? "正在播放..." : "原始录音回放"
        waveformView.setAnimating(isPlaying)
    }

    /// 客态导航栏「评论」按钮：滚动到评论区
    @objc private func navCommentTapped() {
        let frame = commentsStack.convert(commentsStack.bounds, to: scrollView)
        let targetY = max(0, frame.minY - 16)
        scrollView.setContentOffset(CGPoint(x: 0, y: targetY), animated: true)
    }

    /// 主态：进入编辑页，回调里用最新数据全量重建详情
    @objc private func editTapped() {
        let editVC = MemoryEditViewController(memory: memory)
        editVC.onSaved = { [weak self] updated in
            guard let self = self else { return }
            self.memory = updated
            // 编辑可能改了正文/标题/私密，全量重建相关 UI
            self.buildQuote()
            self.configureForViewMode()
        }
        navigationController?.pushViewController(editVC, animated: true)
    }
}

// MARK: - AVAudioPlayerDelegate
extension MemoryDetailViewController: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        // 播放完毕：回到 play 图标，停止波形动画
        isPlaying = false
        let cfg = UIImage.SymbolConfiguration(pointSize: 18, weight: .bold)
        audioPlayButton.setImage(UIImage(systemName: "play.fill", withConfiguration: cfg), for: .normal)
        audioTitleLabel.text = "原始录音回放"
        waveformView.setAnimating(false)
    }
}

// MARK: - 简易波形条视图（占位动效）
final class AudioWaveformView: UIView {

    private let bars: [UIView] = (0..<28).map { _ in UIView() }
    private var displayLink: CADisplayLink?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupBars()
    }

    required init?(coder: NSCoder) { fatalError() }

    private func setupBars() {
        for bar in bars {
            bar.backgroundColor = UIColor.warmAccent.withAlphaComponent(0.85)
            bar.layer.cornerRadius = 1
            addSubview(bar)
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let count = bars.count
        let totalSpacing = bounds.width - CGFloat(count) * 2
        let gap = max(totalSpacing / CGFloat(count - 1), 1)
        for (i, bar) in bars.enumerated() {
            let h = CGFloat.random(in: bounds.height * 0.3 ... bounds.height)
            let x = CGFloat(i) * (2 + gap)
            bar.frame = CGRect(x: x, y: (bounds.height - h) / 2, width: 2, height: h)
        }
    }

    func setAnimating(_ animating: Bool) {
        if animating {
            displayLink = CADisplayLink(target: self, selector: #selector(tick))
            displayLink?.preferredFramesPerSecond = 8
            displayLink?.add(to: .main, forMode: .common)
        } else {
            displayLink?.invalidate()
            displayLink = nil
        }
    }

    @objc private func tick() {
        for bar in bars {
            let h = CGFloat.random(in: bounds.height * 0.25 ... bounds.height)
            UIView.animate(withDuration: 0.12) {
                bar.frame.size.height = h
                bar.frame.origin.y = (self.bounds.height - h) / 2
            }
        }
    }
}
