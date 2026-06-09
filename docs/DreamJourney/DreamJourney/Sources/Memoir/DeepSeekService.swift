import Foundation
import Alamofire

// MARK: - DeepSeek API 服务

/// 封装 DeepSeek 大模型 API 调用（OpenAI 兼容接口）
/// 默认使用 DeepSeek 官方 API: https://api.deepseek.com/v1/chat/completions
/// 如需通过代理访问，在 Info.plist 中设置 DeepSeekAPIBaseURL
/// 模型: DeepSeek-V4-Flash
final class DeepSeekService {

    static let shared = DeepSeekService()

    // MARK: - Configuration

    /// 占位符，用于判断 Key 是否已配置
    private static let placeholderKey = "YOUR_DEEPSEEK_API_KEY"

    /// API Key — 优先从 Info.plist 读取，否则使用下方硬编码值
    private let apiKey: String

    /// API Base URL — 优先从 Info.plist 读取，否则使用 DeepSeek 官方 API
    private static let defaultBaseURL = "https://api.deepseek.com/v1/chat/completions"

    private let baseURL: String

    private let model = "DeepSeek-V4-Flash"
    private let timeoutInterval: TimeInterval = 60

    // MARK: - Init

    private init() {
        // 优先从 Info.plist 读取 API Key
        if let key = Bundle.main.object(forInfoDictionaryKey: "DeepSeekAPIKey") as? String,
           !key.isEmpty, key != Self.placeholderKey {
            self.apiKey = key
        } else {
            self.apiKey = Self.placeholderKey
        }

        // 优先从 Info.plist 读取 Base URL，否则使用 DeepSeek 官方 API
        if let url = Bundle.main.object(forInfoDictionaryKey: "DeepSeekAPIBaseURL") as? String,
           !url.isEmpty {
            self.baseURL = url
        } else {
            self.baseURL = Self.defaultBaseURL
        }
    }

    // MARK: - Request / Response Models

    struct ChatMessage: Encodable {
        let role: String      // "system" / "user" / "assistant"
        let content: String
    }

    private struct ChatRequest: Encodable {
        let model: String
        let messages: [ChatMessage]
        let temperature: Double
        let max_tokens: Int
    }

    private struct ChatResponse: Decodable {
        let choices: [Choice]

        struct Choice: Decodable {
            let message: Message

            struct Message: Decodable {
                let content: String
            }
        }
    }

    // MARK: - Error

    enum DeepSeekError: LocalizedError {
        case apiKeyMissing
        case networkError(Error)
        case invalidResponse
        case emptyContent
        case rateLimited

        var errorDescription: String? {
            switch self {
            case .apiKeyMissing:
                return "API Key 未配置，请在 DeepSeekService 中设置"
            case .networkError(let error):
                return "网络请求失败: \(error.localizedDescription)"
            case .invalidResponse:
                return "服务端返回了无效的响应格式"
            case .emptyContent:
                return "大模型返回了空内容"
            case .rateLimited:
                return "请求过于频繁，请稍后再试"
            }
        }
    }

    // MARK: - Public API

    /// 调用 DeepSeek Chat API
    /// - Parameters:
    ///   - messages: 对话消息列表（包含 system prompt + 用户上下文）
    ///   - temperature: 创意度，0.0~1.0，默认 0.7
    ///   - maxTokens: 最大输出 token 数，默认 2048
    ///   - completion: 回调，成功返回 AI 回复文本，失败返回错误
    func chat(
        messages: [ChatMessage],
        temperature: Double = 0.7,
        maxTokens: Int = 2048,
        completion: @escaping (Result<String, DeepSeekError>) -> Void
    ) {
        // 检查 API Key 是否已配置
        guard apiKey != Self.placeholderKey else {
            completion(.failure(.apiKeyMissing))
            return
        }

        let request = ChatRequest(
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: maxTokens
        )

        let headers: HTTPHeaders = [
            "Content-Type": "application/json",
            "Authorization": "Bearer \(apiKey)",
        ]

        AF.request(
            baseURL,
            method: .post,
            parameters: request,
            encoder: JSONParameterEncoder.default,
            headers: headers
        )
        .validate(statusCode: 200..<300)
        .responseData(queue: .global(qos: .userInitiated)) { [weak self] response in
            self?.handleResponse(response, completion: completion)
        }
    }

    // MARK: - Response Handling

    private func handleResponse(
        _ response: AFDataResponse<Data>,
        completion: @escaping (Result<String, DeepSeekError>) -> Void
    ) {
        // 打印请求详情用于调试
        print("[DeepSeekService] 请求URL: \(response.request?.url?.absoluteString ?? "nil")")
        print("[DeepSeekService] HTTP状态码: \(response.response?.statusCode ?? -1)")
        
        switch response.result {
        case .success(let data):
            // 检查 HTTP 状态码
            if let statusCode = response.response?.statusCode, statusCode == 429 {
                completion(.failure(.rateLimited))
                return
            }
            
            // 非2xx状态码也打印原始响应
            if let statusCode = response.response?.statusCode, statusCode >= 300 {
                if let rawString = String(data: data, encoding: .utf8) {
                    print("[DeepSeekService] ❌ HTTP \(statusCode) 响应体: \(rawString.prefix(1000))")
                }
                completion(.failure(.invalidResponse))
                return
            }

            // 解析响应
            guard let chatResponse = try? JSONDecoder().decode(ChatResponse.self, from: data),
                  let content = chatResponse.choices.first?.message.content,
                  !content.isEmpty else {

                // 尝试打印原始响应用于调试
                if let rawString = String(data: data, encoding: .utf8) {
                    print("[DeepSeekService] 响应解析失败，原始内容: \(rawString.prefix(500))")
                }
                completion(.failure(.invalidResponse))
                return
            }

            completion(.success(content))

        case .failure(let error):
            // Alamofire validate() 失败时，仍然可能有响应体（如403的错误信息）
            if let data = response.data, let rawString = String(data: data, encoding: .utf8) {
                print("[DeepSeekService] ❌ 请求失败，HTTP \(response.response?.statusCode ?? -1)，响应体: \(rawString.prefix(1000))")
            } else {
                print("[DeepSeekService] 网络请求失败: \(error.localizedDescription)")
            }
            completion(.failure(.networkError(error)))
        }
    }
}