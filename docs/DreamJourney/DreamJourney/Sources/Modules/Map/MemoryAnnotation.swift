import Foundation
import MAMapKit

// MARK: - MemoryAnnotation：携带回忆数据的自定义标注
class MemoryAnnotation: MAPointAnnotation {
    var memory: MemoryModel

    init(memory: MemoryModel) {
        self.memory = memory
        super.init()
        coordinate = CLLocationCoordinate2D(latitude: memory.latitude, longitude: memory.longitude)
        title = memory.title
        subtitle = memory.subtitle
    }
}
