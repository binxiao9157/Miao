# Codex SSH 连接与一键部署说明

本文档记录 Codex 连接当前 Miao 服务端服务器、切换应用用户、执行一键部署、检查日志和处理常见部署问题的标准操作。

## 适用范围

- 本地服务端/PWA 仓库：`/Users/lanzhou/Documents/AiCoding/GoogleAiStudio/Miao_remote`
- 远程服务端目录：`/home/miao/app`
- 线上域名：`https://www.mmdd10.tech`
- 服务器 IP：`124.221.2.31`
- 本文档只覆盖 PWA/Node 服务端部署，不覆盖微信 Taro 小程序、微信原生小程序的发布流程。

## 服务器信息

| 项目 | 当前值 |
| --- | --- |
| SSH alias | `miao-server` |
| 服务器 IP | `124.221.2.31` |
| SSH 端口 | `22` |
| SSH 登录用户 | `ubuntu` |
| 本机私钥路径 | `~/.ssh/id_ed25519_xb_server` |
| 应用运行用户 | `miao` |
| 应用目录 | `/home/miao/app` |
| PM2 应用名 | `miao` |
| 远程仓库 | `git@github.com:binxiao9157/Miao.git` |
| 服务本地端口 | `127.0.0.1:3000` |

注意：文档只记录私钥路径和环境变量名称，不记录私钥内容、`.env` 明文、API Key、AccessKey、JWT 密钥等敏感值。

## 本机 SSH 配置

Codex 当前通过本机 `~/.ssh/config` 中的 alias 连接服务器，配置应类似：

```sshconfig
Host miao-server
  HostName 124.221.2.31
  User ubuntu
  Port 22
  IdentityFile ~/.ssh/id_ed25519_xb_server
```

确认 SSH alias 是否正确：

```bash
ssh -G miao-server | sed -n '1,80p'
```

重点确认这些字段：

```text
user ubuntu
hostname 124.221.2.31
port 22
identityfile ~/.ssh/id_ed25519_xb_server
```

基础连通性测试：

```bash
ssh miao-server 'whoami && hostname'
```

预期登录用户是：

```text
ubuntu
```

## 切换到应用用户

应用由 `miao` 用户维护。不要直接用 `ubuntu` 用户修改 `/home/miao/app` 里的应用文件。

进入应用用户 shell：

```bash
ssh miao-server 'sudo -iu miao'
```

Codex 执行单条 `miao` 用户命令：

```bash
ssh miao-server 'sudo -iu miao bash -lc "whoami && pwd"'
```

预期：

```text
miao
/home/miao
```

进入应用目录：

```bash
ssh miao-server 'sudo -iu miao bash -lc "cd /home/miao/app && pwd"'
```

## 检查部署目录

```bash
ssh miao-server 'sudo -iu miao bash -lc "cd /home/miao/app && git status --short --branch && git log --oneline -5"'
```

关键文件：

- `/home/miao/app/deploy.sh`
- `/home/miao/app/server.ts`
- `/home/miao/app/package.json`
- `/home/miao/app/package-lock.json`
- `/home/miao/app/.env`
- `/home/miao/app/ecosystem.config.cjs`
- `/home/miao/app/dist/`

当前服务器目录可能存在运行期或部署期生成文件，例如 `dist/`、`public/service-worker.js`、`deploy.sh`、`ecosystem.config.cjs`、logo 资源等。不要把这些文件默认当成本地源码修改处理，除非明确要调整部署结构。

## 一键部署

标准一键部署命令：

```bash
ssh miao-server 'sudo -iu miao bash -lc "cd /home/miao/app && ./deploy.sh"'
```

部署脚本通常会执行：

- 保留服务器上的运行期资源，例如 logo、上传文件、`.env`
- 拉取远程仓库最新代码
- 安装依赖
- 构建前端和服务端
- 重启 PM2 应用 `miao`
- 输出服务状态

部署成功时应看到类似：

```text
==> Deploy success!
```

当前已验证的线上版本示例：

```text
d6f7329 fix: disable volc image watermarks
```

如果远程 `package-lock.json` 因服务器依赖安装产生本地改动，部署可能失败并提示：

```text
Your local changes to the following files would be overwritten by merge:
  package-lock.json
```

这种情况下，如果确认只是服务器安装依赖产生的锁文件改动，可以执行：

```bash
ssh miao-server 'sudo -iu miao bash -lc "cd /home/miao/app && git restore --staged --worktree -- package-lock.json && ./deploy.sh"'
```

## 部署后验证

检查 PM2 状态：

```bash
ssh miao-server 'sudo -iu miao bash -lc "pm2 status && pm2 show miao | sed -n '\''1,40p'\''"'
```

重点字段：

```text
status      online
name        miao
node env    production
exec cwd    /home/miao/app
```

当前 PM2 运行方式：

```text
script path  /home/miao/app/server.ts
interpreter  ./node_modules/.bin/tsx
cwd          /home/miao/app
```

检查服务器本地 HTTP：

```bash
ssh miao-server 'curl -sS -o /tmp/miao_local_root.html -w "local_root:%{http_code} bytes:%{size_download}\n" http://127.0.0.1:3000/'
```

预期：

```text
local_root:200
```

检查线上域名：

```bash
curl --noproxy '*' -sS -o /tmp/miao_root.html -w 'https_root:%{http_code} bytes:%{size_download}\n' https://www.mmdd10.tech/
```

预期：

```text
https_root:200
```

检查未登录 API：

```bash
ssh miao-server 'curl -sS -o /tmp/miao_cats.json -w "cats:%{http_code} bytes:%{size_download}\n" http://127.0.0.1:3000/api/v1/cats'
```

未带登录态时返回 `401` 是正常结果。

## 日志查看

查看最近 PM2 日志：

```bash
ssh miao-server 'sudo -iu miao bash -lc "pm2 logs miao --lines 100"'
```

只看错误日志：

```bash
ssh miao-server 'sudo -iu miao bash -lc "tail -n 120 ~/.pm2/logs/miao-error.log"'
```

只看输出日志：

```bash
ssh miao-server 'sudo -iu miao bash -lc "tail -n 120 ~/.pm2/logs/miao-out.log"'
```

实时跟踪：

```bash
ssh miao-server 'sudo -iu miao bash -lc "pm2 logs miao"'
```

如果要跟踪线上请求是否打到服务端，可以同时看 PM2 日志和 Nginx 日志。Nginx 日志路径需按服务器实际配置确认，常见路径：

```bash
ssh miao-server 'sudo tail -n 100 /var/log/nginx/access.log'
ssh miao-server 'sudo tail -n 100 /var/log/nginx/error.log'
```

## 环境变量

查看 `.env` 里有哪些 key，不输出值：

```bash
ssh miao-server 'sudo -iu miao bash -lc "cd /home/miao/app && cut -d= -f1 .env | sed '\''/^\s*$/d'\''"'
```

生产环境当前需要重点确认这些变量存在：

- `DASHSCOPE_API_KEY`
- `DASHSCOPE_BASE_URL`
- `DASHSCOPE_IMAGE_MODEL`
- `DASHSCOPE_VIDEO_MODEL`
- `VOLC_API_KEY`
- `VOLC_BASE_URL`
- `VOLC_IMAGE_MODEL`
- `VOLC_VIDEO_MODEL`
- `AI_PROVIDER`
- `JWT_SECRET`
- `ADMIN_TOKEN`

注意事项：

- `AI_PROVIDER` 表示默认 AI 服务商，可配置为项目支持的 provider，例如 `dashscope` 或 `volcengine`。
- 前端隐藏后台传入 provider/model 时，请求级配置会覆盖默认 provider。
- `JWT_SECRET`、`ADMIN_TOKEN` 是生产安全配置，缺失会导致服务启动或管理接口异常。
- 更新 `JWT_SECRET` 后，旧登录 token 可能失效，需要重新登录。
- 不要在文档、聊天、提交记录中输出任何环境变量明文值。

## 当前 AI 配置说明

服务器日志中已确认的模型配置形态：

```text
DashScope image model: qwen-image-2.0
DashScope video model: wan2.2-i2v-flash
DashScope base url: https://dashscope.aliyuncs.com/api/v1

Volc image model: doubao-seedream-4-5-251128
Volc video model: doubao-seedance-1-5-pro-251215
Volc base url: https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
```

如果排查图片或视频生成失败，优先看：

- 请求使用的 provider
- 请求使用的 image/video model
- 是否进入 mock mode
- 服务端日志里的 provider 初始化信息
- 第三方接口返回的 status code 和 error body

## ffmpeg 与视频末帧

当前服务端视频末帧提取依赖 `ffmpeg-static`，但服务器上曾出现安装时下载 ffmpeg 二进制卡住的问题。解决方式是安装系统 `ffmpeg` 并让 `ffmpeg-static` 指向系统二进制。

检查：

```bash
ssh miao-server 'sudo -iu miao bash -lc "cd /home/miao/app && ls -l node_modules/ffmpeg-static/ffmpeg && node -e '\''console.log(require(\"ffmpeg-static\"))'\''"'
```

预期能看到：

```text
/home/miao/app/node_modules/ffmpeg-static/ffmpeg
```

如果 `npm install` 卡在 `node install.js` 下载 ffmpeg，可以在服务器上执行：

```bash
ssh miao-server 'sudo apt-get update && sudo apt-get install -y ffmpeg'
ssh miao-server 'sudo -iu miao bash -lc "cd /home/miao/app && mkdir -p node_modules/ffmpeg-static && ln -sf /usr/bin/ffmpeg node_modules/ffmpeg-static/ffmpeg"'
```

然后重新部署：

```bash
ssh miao-server 'sudo -iu miao bash -lc "cd /home/miao/app && ./deploy.sh"'
```

## 常见故障

### SSH 连接提示 MaxStartups

如果 SSH 返回类似：

```text
Exceeded MaxStartups
```

说明服务器 `sshd` 正在拒绝过多未认证连接。处理方式：

- 等待几十秒后重试
- 避免同时发起大量 SSH 命令
- 不要并行开多个 `pm2 logs` 长连接

### PM2 显示 online 但页面异常

依次检查：

```bash
ssh miao-server 'sudo -iu miao bash -lc "pm2 status && tail -n 120 ~/.pm2/logs/miao-error.log && tail -n 120 ~/.pm2/logs/miao-out.log"'
```

再检查本地端口：

```bash
ssh miao-server 'curl -sS -o /tmp/miao_local_root.html -w "local_root:%{http_code} bytes:%{size_download}\n" http://127.0.0.1:3000/'
```

如果本地 `127.0.0.1:3000` 不通，问题在 Node/PM2。  
如果本地通、域名不通，问题在 Nginx、HTTPS、域名解析或防火墙。

### 部署后接口返回 401

未登录访问鉴权接口返回 `401` 是正常结果。需要区分：

- `401`：通常是未登录或 token 无效
- `403`：通常是权限或后台 token 不匹配
- `400`：通常是请求体、模型参数、素材 URL 或第三方接口参数问题
- `429`：通常是第三方模型接口限流、额度或并发限制
- `500`：服务端运行错误，需要看 PM2 error log

### 管理接口失效

如果刚更新过 `JWT_SECRET` 或 `ADMIN_TOKEN`：

- 旧 token 可能全部失效
- 前端如果仍硬编码旧后台 token，管理接口可能返回 `403`
- 后续应把前端后台 token 登录/配置流程与服务端 `ADMIN_TOKEN` 保持一致

## 操作原则

- 服务端部署统一使用 `miao` 用户执行。
- 不要直接在服务器上编辑业务源码后长期保留，应优先从本地提交到 GitHub，再一键部署。
- 服务器 `.env`、上传文件、运行期资源不得覆盖。
- 所有密钥只记录变量名和用途，不记录明文值。
- 部署前先确认本地代码已推送到远程仓库。
- 部署后至少检查 PM2 状态、本地 `127.0.0.1:3000` 和线上域名 `https://www.mmdd10.tech`。
