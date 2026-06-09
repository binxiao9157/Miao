import Foundation
import AVFoundation
import Alamofire
import CocoaLumberjack

// MARK: - 回忆录 TTS 朗读服务

/// 使用火山引擎大模型 TTS V3 + 声音复刻音色，将回忆录散文合成为语音
/// 
/// 流程：
/// 1. 检查 speaker_id 是否就绪
/// 2. 调用 TTS V3 单向流式接口，传入 speaker_id + 文本
/// 3. 流式接收音频数据，拼接为完整 MP3/M4A 文件
/// 4. 保存到 ApplicationSupport/memoir_audio/{memoirId}.mp3
final class MemoirTTSService {

    static let shared = MemoirTTSService()

    // MARK: - 配置

    /// TTS API Key（复用声音复刻的 API Key）
    private static let placeholderAPIKey = "YOUR_VOICECLONE_API_KEY"

    private var apiKey: String

    /// TTS V3 HTTP 流式接口（一次性输入文本，流式输出音频）
    /// 比 WebSocket 更简单，适合回忆录这种完整文本一次性合成的场景
    private let ttsURL = "https://openspeech.bytedance.com/api/v3/tts/unidirectional"

    /// 音频存储目录
    private let audioDirectory: URL

    // MARK: - 合成状态

    private var isSynthesizing = false

    // MARK: - Init

    private init() {
        if let key = Bundle.main.infoDictionary?["VoiceCloneAPIKey"] as? String,
           !key.isEmpty, key != Self.placeholderAPIKey {
            apiKey = key
        } else {
            apiKey = Self.placeholderAPIKey
        }

        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        audioDirectory = appSupport.appendingPathComponent("memoir_audio", isDirectory: true)
        try? FileManager.default.createDirectory(at: audioDirectory, withIntermediateDirectories: true)
    }

    // MARK: - 公开 API

    /// 将回忆录散文合成为语音
    /// - Parameters:
    ///   - memoir: 回忆录模型
    ///   - speed: 语速（-50~100，默认 -10 稍慢适合老人听）
    ///   - volume: 音量（-50~100，默认 10 稍大声适合老人听）
    ///   - completion: 结果回调，成功返回本地音频文件 URL
    func synthesize(memoir: MemoirModel,
                    speed: Int = -10,
                    volume: Int = 10,
                    completion: @escaping (Result<URL, TTSError>) -> Void) {

        guard apiKey != Self.placeholderAPIKey else {
            completion(.failure(.apiKeyMissing))
            return
        }

        guard let speakerId = memoir.speakerId ?? VoiceCloneService.shared.currentSpeakerId,
              !speakerId.isEmpty else {
            completion(.failure(.noSpeakerId))
            return
        }

        guard !memoir.prose.isEmpty else {
            completion(.failure(.emptyText))
            return
        }

        guard !isSynthesizing else {
            completion(.failure(.alreadySynthesizing))
            return
        }

        isSynthesizing = true

        // 先检查音色是否就绪
        VoiceCloneService.shared.isVoiceReady(speakerId: speakerId) { [weak self] ready in
            guard let self = self else { return }
            if !ready {
                self.isSynthesizing = false
                completion(.failure(.voiceNotReady))
                return
            }
            self.performSynthesis(memoir: memoir, speakerId: speakerId, speed: speed, volume: volume, completion: completion)
        }
    }

    /// 获取已合成的音频文件 URL
    func getAudioURL(for memoirId: String) -> URL? {
        let mp3Path = audioDirectory.appendingPathComponent("\(memoirId).mp3")
        let m4aPath = audioDirectory.appendingPathComponent("\(memoirId).m4a")
        if FileManager.default.fileExists(atPath: mp3Path.path) { return mp3Path }
        if FileManager.default.fileExists(atPath: m4aPath.path) { return m4aPath }
        return nil
    }

    /// 删除已合成的音频文件
    func deleteAudio(for memoirId: String) {
        let mp3Path = audioDirectory.appendingPathComponent("\(memoirId).mp3")
        let m4aPath = audioDirectory.appendingPathComponent("\(memoirId).m4a")
        try? FileManager.default.removeItem(at: mp3Path)
        try? FileManager.default.removeItem(at: m4aPath)
    }

    // MARK: - 内部实现

    private func performSynthesis(memoir: MemoirModel,
                                   speakerId: String,
                                   speed: Int,
                                   volume: Int,
                                   completion: @escaping (Result<URL, TTSError>) -> Void) {

        // 构建请求体 — TTS V3 HTTP Chunked 单向流式
        // 文档：https://www.volcengine.com/docs/6561/1598757
        // 注意：req_params.additions 类型为 jsonstring，需要传 JSON 编码后的字符串
        let additionsDict: [String: Any] = [
            "explicit_language": "zh-cn"  // 中文为主，支持中英混
        ]
        let additionsString = (try? JSONSerialization.data(withJSONObject: additionsDict))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "{\"explicit_language\":\"zh-cn\"}"

        let body: [String: Any] = [
            "user": [
                "uid": memoir.authorId  // 用户标识
            ],
            "req_params": [
                "text": memoir.prose,
                "speaker": speakerId,       // 声音复刻的 speaker_id
                "audio_params": [
                    "format": "mp3",         // 音频格式
                    "sample_rate": 24000,    // 采样率
                    "speech_rate": speed,    // 语速 [-50, 100]，默认 -10（稍慢，适老化）
                    "loudness_rate": volume  // 音量 [-50, 100]，默认 10（稍大声，适老化）
                ],
                "additions": additionsString  // jsonstring 类型，传 JSON 字符串
            ] as [String: Any]
        ] as [String: Any]

        let headers: HTTPHeaders = [
            "Content-Type": "application/json",
            "X-Api-Key": apiKey,
            "X-Api-Request-Id": UUID().uuidString,
            "X-Api-Resource-Id": "seed-icl-1.0"  // 声音复刻 ICL 1.0 版本
        ]

        let outputPath = audioDirectory.appendingPathComponent("\(memoir.id).mp3")

        DDLogInfo("[MemoirTTS] 开始合成: memoirId=\(memoir.id), speakerId=\(speakerId), 文本长度=\(memoir.prose.count)")

        // V3 HTTP Chunked 返回的是 JSON 行，每行包含 base64 编码的音频数据
        // 格式: {"code": 0, "message": "", "data": "<base64_audio_chunk>"}
        // 结束标志: {"code": 20000000, "message": "ok", "data": null}
        var audioData = Data()

        AF.request(ttsURL, method: .post, parameters: body, encoding: JSONEncoding.default, headers: headers)
            .validate(statusCode: 200..<300)
            .responseData { [weak self] response in
                guard let self = self else { return }
                self.isSynthesizing = false

                switch response.result {
                case .success(let responseData):
                    // V3 HTTP Chunked 返回的是多行 JSON，需要逐行解析
                    // 每行格式: {"code":0, "message":"", "data":"base64_audio"} 或 {"code":20000000, ...}
                    guard let responseString = String(data: responseData, encoding: .utf8) else {
                        DDLogError("[MemoirTTS] 响应无法解码为字符串")
                        completion(.failure(.synthesisFailed("响应解码失败")))
                        return
                    }

                    let lines = responseString.components(separatedBy: "\n").filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }

                    for line in lines {
                        let trimmed = line.trimmingCharacters(in: .whitespaces)
                        guard let lineData = trimmed.data(using: .utf8),
                              let json = try? JSONSerialization.jsonObject(with: lineData) as? [String: Any] else {
                            continue
                        }

                        let code = json["code"] as? Int ?? 0

                        // 20000000 = 合成结束
                        if code == 20000000 {
                            DDLogInfo("[MemoirTTS] 合成完成标志收到")
                            break
                        }

                        // 错误
                        if code != 0 {
                            let msg = json["message"] as? String ?? "未知错误"
                            DDLogError("[MemoirTTS] 合成错误: code=\(code), message=\(msg)")
                            completion(.failure(.synthesisFailed("TTS错误(\(code)): \(msg)")))
                            return
                        }

                        // 提取 base64 音频数据
                        if let base64Str = json["data"] as? String, !base64Str.isEmpty {
                            if let chunkData = Data(base64Encoded: base64Str) {
                                audioData.append(chunkData)
                            }
                        }
                    }

                    // 写入文件
                    if audioData.count > 0 {
                        do {
                            try audioData.write(to: outputPath, options: .atomic)
                            DDLogInfo("[MemoirTTS] 合成完成: \(outputPath.path), 大小=\(audioData.count) bytes")
                            completion(.success(outputPath))
                        } catch {
                            DDLogError("[MemoirTTS] 写入文件失败: \(error.localizedDescription)")
                            completion(.failure(.synthesisFailed("文件写入失败")))
                        }
                    } else {
                        DDLogError("[MemoirTTS] 合成音频数据为空")
                        completion(.failure(.synthesisFailed("合成的音频数据为空")))
                    }

                case .failure(let error):
                    DDLogError("[MemoirTTS] 合成请求失败: \(error.localizedDescription)")
                    try? FileManager.default.removeItem(at: outputPath)
                    completion(.failure(.networkError(error.localizedDescription)))
                }
            }
    }

    // MARK: - 降级方案：系统 TTS

    /// 当声音复刻不可用时，使用系统 TTS 作为降级
    /// iOS 原生 AVSpeechSynthesizer，不需要网络，但音色不是老人的
    func synthesizeWithSystemTTS(memoir: MemoirModel,
                                  completion: @escaping (Result<URL, TTSError>) -> Void) {
        guard !memoir.prose.isEmpty else {
            completion(.failure(.emptyText))
            return
        }

        let synthesizer = AVSpeechSynthesizer()
        let utterance = AVSpeechUtterance(string: memoir.prose)
        utterance.voice = AVSpeechSynthesisVoice(language: "zh-CN")
        utterance.rate = AVSpeechUtteranceMinimumSpeechRate + 0.1  // 稍慢
        utterance.pitchMultiplier = 0.85  // 低沉一些，模拟老人声音
        utterance.volume = 1.0

        // 系统TTS无法直接导出文件，这里用占位逻辑
        // 实际使用时建议直接用 AVSpeechSynthesizer 播放，不保存文件
        DDLogInfo("[MemoirTTS] 使用系统TTS降级播放（无法导出文件）")
        completion(.failure(.systemTTSNoExport))
    }
}

// MARK: - 错误类型

enum TTSError: LocalizedError {
    case apiKeyMissing
    case noSpeakerId
    case voiceNotReady         // 音色未训练完成
    case emptyText
    case alreadySynthesizing   // 正在合成中
    case networkError(String)
    case synthesisFailed(String)
    case systemTTSNoExport     // 系统 TTS 不支持导出

    var errorDescription: String? {
        switch self {
        case .apiKeyMissing:
            return "声音复刻 API Key 未配置"
        case .noSpeakerId:
            return "未找到声音复刻音色，请先完成声音复刻训练"
        case .voiceNotReady:
            return "声音复刻训练尚未完成，请稍后再试"
        case .emptyText:
            return "回忆录内容为空"
        case .alreadySynthesizing:
            return "正在合成中，请稍候"
        case .networkError(let msg):
            return "网络错误: \(msg)"
        case .synthesisFailed(let msg):
            return "语音合成失败: \(msg)"
        case .systemTTSNoExport:
            return "系统 TTS 仅支持在线播放"
        }
    }
}