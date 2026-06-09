import Foundation
import AVFoundation
import CocoaLumberjack

// MARK: - 回忆录音频播放器

/// 封装 AVAudioPlayer，提供回忆录朗读音频的播放/暂停/停止/进度功能
/// 适老化设计：音量增强、支持系统 TTS 降级播放
final class MemoirAudioPlayer: NSObject {

    static let shared = MemoirAudioPlayer()

    // MARK: - 状态

    enum PlaybackState {
        case idle         // 未加载
        case loading      // 加载中
        case playing      // 播放中
        case paused       // 已暂停
        case ended        // 播放完毕
    }

    private(set) var state: PlaybackState = .idle

    /// 播放进度回调
    var onProgressChanged: ((TimeInterval, TimeInterval) -> Void)?  // (currentTime, totalTime)

    /// 播放状态回调
    var onStateChanged: ((PlaybackState) -> Void)?

    /// 播放完成回调
    var onPlaybackFinished: (() -> Void)?

    // MARK: - 内部

    private var player: AVAudioPlayer?
    private var progressTimer: Timer?
    private var currentMemoirId: String?

    // 系统 TTS 降级
    private let systemSynthesizer = AVSpeechSynthesizer()
    private var isUsingSystemTTS = false

    // MARK: - Init

    private override init() {
        super.init()
    }

    deinit {
        stop()
        progressTimer?.invalidate()
    }

    // MARK: - 公开 API

    /// 播放回忆录音频文件
    func play(audioURL: URL, memoirId: String) {
        stop()

        currentMemoirId = memoirId
        isUsingSystemTTS = false

        do {
            // 配置音频会话
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)

            player = try AVAudioPlayer(contentsOf: audioURL)
            player?.delegate = self
            player?.volume = 1.0  // 适老化：最大音量

            guard let player = player else { return }

            if player.prepareToPlay() {
                player.play()
                updateState(.playing)
                startProgressTimer()
                DDLogInfo("[MemoirAudio] 开始播放: \(memoirId), 时长=\(String(format: "%.1f", player.duration))s")
            } else {
                DDLogError("[MemoirAudio] 音频准备失败")
                updateState(.idle)
            }
        } catch {
            DDLogError("[MemoirAudio] 播放失败: \(error.localizedDescription)")
            updateState(.idle)
        }
    }

    /// 使用系统 TTS 朗读（降级方案，无需音频文件）
    func playWithSystemTTS(text: String, memoirId: String) {
        stop()

        currentMemoirId = memoirId
        isUsingSystemTTS = true

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "zh-CN")
        utterance.rate = AVSpeechUtteranceMinimumSpeechRate + 0.1  // 稍慢
        utterance.pitchMultiplier = 0.85  // 低沉一些
        utterance.volume = 1.0

        systemSynthesizer.speak(utterance)
        updateState(.playing)
        DDLogInfo("[MemoirAudio] 系统 TTS 朗读: \(memoirId)")
    }

    /// 暂停
    func pause() {
        if isUsingSystemTTS {
            systemSynthesizer.pauseSpeaking(at: .immediate)
        } else {
            player?.pause()
        }
        stopProgressTimer()
        updateState(.paused)
    }

    /// 继续播放
    func resume() {
        if isUsingSystemTTS {
            systemSynthesizer.continueSpeaking()
        } else {
            player?.play()
            startProgressTimer()
        }
        updateState(.playing)
    }

    /// 停止
    func stop() {
        if isUsingSystemTTS {
            systemSynthesizer.stopSpeaking(at: .immediate)
        } else {
            player?.stop()
        }
        player = nil
        stopProgressTimer()
        updateState(.idle)
        currentMemoirId = nil
    }

    /// 跳转到指定时间
    func seek(to time: TimeInterval) {
        guard let player = player, !isUsingSystemTTS else { return }
        player.currentTime = min(time, player.duration)
        onProgressChanged?(player.currentTime, player.duration)
    }

    /// 当前播放时间
    var currentTime: TimeInterval {
        return player?.currentTime ?? 0
    }

    /// 总时长
    var duration: TimeInterval {
        return player?.duration ?? 0
    }

    /// 格式化时间 mm:ss
    static func formatTime(_ time: TimeInterval) -> String {
        let totalSeconds = Int(max(0, time))
        let minutes = totalSeconds / 60
        let seconds = totalSeconds % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    // MARK: - 内部方法

    private func updateState(_ newState: PlaybackState) {
        state = newState
        onStateChanged?(newState)
    }

    private func startProgressTimer() {
        stopProgressTimer()
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            guard let self = self, let player = self.player else { return }
            self.onProgressChanged?(player.currentTime, player.duration)
        }
    }

    private func stopProgressTimer() {
        progressTimer?.invalidate()
        progressTimer = nil
    }
}

// MARK: - AVAudioPlayerDelegate

extension MemoirAudioPlayer: AVAudioPlayerDelegate {

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        stopProgressTimer()
        updateState(.ended)
        onPlaybackFinished?()
        DDLogInfo("[MemoirAudio] 播放完毕")
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        DDLogError("[MemoirAudio] 解码错误: \(error?.localizedDescription ?? "未知")")
        stopProgressTimer()
        updateState(.idle)
    }
}