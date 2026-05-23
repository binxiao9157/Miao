import fs from "fs";

export function ensureDirectory(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

export function readJSON<T>(file: string, fallback: T): T {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (error) {
    console.error(`读取 JSON 文件失败: ${file}`, error);
    return fallback;
  }
}

export function writeJSON(file: string, data: unknown) {
  const tempFile = `${file}.tmp`;

  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, file);
  } catch (error) {
    console.error(`原子写入 JSON 文件失败: ${file}`, error);

    try {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    } catch {}

    try {
      fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
    } catch (fallbackError) {
      console.error(`二次降级写入也失败: ${file}`, fallbackError);
    }
  }
}
