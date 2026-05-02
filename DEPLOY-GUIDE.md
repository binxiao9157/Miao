# Miao PWA 腾讯云轻量服务器部署手册

> 最后更新: 2026-04-15

---

## 一、服务器选购

| 项目 | 推荐配置 |
|------|----------|
| 产品 | 腾讯云轻量应用服务器 |
| 规格 | 2 核 2G（起步），推荐 2 核 4G |
| 系统 | Ubuntu 22.04 LTS |
| 地域 | 北京（靠近火山引擎 API，延迟最低） |
| 带宽 | 5Mbps 或按量计费 |
| 磁盘 | 40G SSD 系统盘 |

---

## 二、服务器初始化

SSH 登录服务器后，依次执行：

```bash
# 1. 系统更新
sudo apt update && sudo apt upgrade -y

# 2. 安装基础工具
sudo apt install -y curl git nginx certbot python3-certbot-nginx

# 3. 安装 Node.js 20 LTS（推荐当前活跃 LTS 版本）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. 验证版本
node -v   # 应输出 v20.x
npm -v    # 应输出 10.x+

# 5. 安装 PM2 进程管理器
sudo npm install -g pm2

# 6. 安装 PM2 日志轮转（防止日志撑爆磁盘）
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# 7. 创建应用用户（不用 root 跑应用）
sudo useradd -m -s /bin/bash miao
sudo mkdir -p /home/miao/app /home/miao/app/logs
sudo chown -R miao:miao /home/miao
```

---

## 三、部署代码

### 3.1 配置 SSH 密钥（用于 Git 拉取代码）

国内服务器通过 HTTPS 访问 GitHub 不稳定，使用 SSH 方式更可靠。

```bash
# 切换到应用用户
sudo su - miao

# 生成 SSH 密钥（一路回车，不设密码）
ssh-keygen -t ed25519 -C "miao-server"

# 查看公钥
cat ~/.ssh/id_ed25519.pub
```

将输出的公钥复制，添加到 GitHub → **Settings** → **SSH and GPG keys** → **New SSH key**（Title 填 `miao-server`）。

验证连接：

```bash
ssh -T git@github.com
# 首次连接输入 yes，看到 "Hi binxiao9157!" 即成功
```

### 3.2 克隆代码并安装依赖

```bash
cd ~/app

# 克隆代码（使用 SSH 方式）
git clone git@github.com:binxiao9157/Miao.git .

# 安装依赖
npm install

# 安装 Tailwind CSS 原生绑定（Linux x64 环境必须）
npm install @tailwindcss/oxide-linux-x64-gnu
```

---

## 四、环境变量配置

```bash
cat > /home/miao/app/.env << 'EOF'
NODE_ENV=production
PORT=3000

# ===== 火山引擎（服务端专用，不带 VITE_ 前缀）=====
VOLC_API_KEY=<your_volc_api_key>
VOLC_ACCESS_KEY=<your_volc_access_key>
VOLC_SECRET_KEY=<your_volc_secret_key>
VOLC_MODEL_ID=doubao-seedance-1-5-pro-251215
VOLC_T2I_MODEL_ID=doubao-t2i-v2
VOLC_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks

# ===== 可选 =====
# GEMINI_API_KEY=<your_gemini_key>
EOF

# 限制 .env 文件权限
chmod 600 /home/miao/app/.env
```

> **安全须知**: 只用不带 `VITE_` 前缀的变量名。带 `VITE_` 前缀的变量会被 Vite 编译到前端 JS 中，暴露给所有用户。server.ts 已支持读取不带前缀的版本。
>
> **说明**: `VOLC_ACCESS_KEY` 和 `VOLC_SECRET_KEY` 当前代码暂未使用，预留供后续 STS 签名鉴权等场景使用。

---

## 五、构建前端

```bash
cd /home/miao/app
npm run build
# 产出 dist/ 目录，即前端静态资源
```

构建完成后确认：
```bash
ls -la dist/
# 应包含 index.html, assets/, manifest.json 等
```

---

## 六、PM2 进程管理

### 6.1 创建 PM2 配置文件

```bash
cat > /home/miao/app/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'miao',
    script: 'server.ts',
    interpreter: './node_modules/.bin/tsx',
    cwd: '/home/miao/app',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '500M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/home/miao/app/logs/error.log',
    out_file: '/home/miao/app/logs/output.log',
    merge_logs: true,
    max_restarts: 10,
    restart_delay: 3000,
  }]
};
EOF
```

### 6.2 启动

> **重要**: PM2 必须在 `miao` 用户下运行，不要用 `ubuntu` 或 `root` 用户启动，否则进程归属和开机自启都会出问题。

```bash
# 确保切换到 miao 用户
sudo su - miao
cd ~/app

pm2 start ecosystem.config.cjs
pm2 status           # 确认 miao 状态为 online
pm2 logs miao        # 查看日志
```

### 6.3 验证

```bash
curl http://127.0.0.1:3000/api/health
# 应返回 {"status":"ok","timestamp":"...","env":"production","hasApiKey":true}
```

### 6.4 设置开机自启

```bash
# 先退回 root
exit

# 以 miao 用户身份生成 startup 脚本
sudo -u miao bash -c 'cd /home/miao/app && pm2 startup systemd -u miao --hp /home/miao'
# 按提示执行输出的 sudo 命令

sudo -u miao bash -c 'pm2 save'
```

---

## 七、Nginx 反向代理

> **分阶段配置**: 先用纯 HTTP 配置验证应用可访问，申请 SSL 证书后再升级为完整 HTTPS 配置。

### 7.1 第一阶段：纯 HTTP 配置（申请证书前使用）

```bash
sudo tee /etc/nginx/sites-available/miao > /dev/null << 'NGINX'
server {
    listen 80;
    server_name www.mmdd10.tech mmdd10.tech;

    client_max_body_size 60m;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
        proxy_send_timeout 120s;
        proxy_buffering off;
    }

    location = /service-worker.js {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /assets/ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1024;
    gzip_comp_level 6;
}
NGINX
```

启用站点并重载：

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/miao /etc/nginx/sites-enabled/miao
sudo nginx -t && sudo systemctl reload nginx
```

验证：浏览器访问 `http://www.mmdd10.tech`，应能看到 Miao 应用。确认正常后继续第八节申请 SSL 证书。

### 7.2 第二阶段：补充安全头（证书申请成功后执行）

> Certbot 会自动在 7.1 的配置上添加 SSL 相关指令和 HTTP→HTTPS 跳转。我们只需在此基础上补充安全头等增强配置。分两次写入。

**第一次写入**（覆盖文件，写入主站前半段 + 安全头）：

```bash
sudo tee /etc/nginx/sites-available/miao > /dev/null << 'NGINX'
server {
    server_name www.mmdd10.tech mmdd10.tech;

    client_max_body_size 60m;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
        proxy_send_timeout 120s;
        proxy_buffering off;
    }

    location = /service-worker.js {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /assets/ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
NGINX
```

**第二次写入**（追加 location、gzip、SSL 和 HTTP 跳转）：

```bash
sudo tee -a /etc/nginx/sites-available/miao > /dev/null << 'NGINX'

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1024;
    gzip_comp_level 6;

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/www.mmdd10.tech/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/www.mmdd10.tech/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

# HTTP -> HTTPS 重定向
server {
    if ($host = mmdd10.tech) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = www.mmdd10.tech) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name www.mmdd10.tech mmdd10.tech;
    return 404; # managed by Certbot
}
NGINX
```

**测试并重载**：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 八、SSL 证书

### 8.1 前提条件

在申请证书前，确认以下条件已满足：

**1) DNS 解析已配置**

在域名注册商（如腾讯云 DNSPod）添加两条 A 记录：

| 主机记录 | 记录类型 | 记录值 | TTL |
|----------|----------|--------|-----|
| `www` | A | `124.221.2.31` | 600 |
| `@` | A | `124.221.2.31` | 600 |

验证 DNS 是否生效：

```bash
# 在服务器上执行，确认都能解析到你的 IP
dig +short www.mmdd10.tech
dig +short mmdd10.tech
# 两条命令都应返回你的服务器 IP
```

如果 `dig` 未安装：`sudo apt install -y dnsutils`

**2) ICP 备案**

- 大陆服务器（如北京地域）：域名必须已完成 ICP 备案，否则 80/443 端口会被运营商拦截
- 香港/海外服务器：无需备案，可跳过

**3) 确认 Nginx 80 端口正常**

```bash
# 确认 7.1 节的 HTTP 配置已生效
curl -I http://www.mmdd10.tech
# 应返回 HTTP/1.1 200 OK，说明 Nginx 和 Node 都正常
```

### 8.2 安装 Certbot

如果第二节已安装可跳过，否则执行：

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 8.3 申请 Let's Encrypt 免费证书

> **重要**: 执行此步骤时，Nginx 必须使用 7.1 节的纯 HTTP 配置（监听 80 端口）。如果你已经跟到这里，配置应该是对的。

```bash
# 申请证书（同时包含 www 和裸域名）
sudo certbot --nginx -d www.mmdd10.tech -d mmdd10.tech
```

交互过程中会依次提示：

```
1. Enter email address: 输入你的邮箱（用于证书到期提醒）
2. (A)gree/(C)ancel: 输入 A 同意服务条款
3. (Y)es/(N)o: 输入 N（不订阅邮件推广）
```

成功后会看到类似输出：

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/www.mmdd10.tech/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/www.mmdd10.tech/privkey.pem
```

### 8.4 验证证书文件

```bash
# 确认证书文件存在
sudo ls -la /etc/letsencrypt/live/www.mmdd10.tech/
# 应包含: fullchain.pem  privkey.pem  cert.pem  chain.pem

# 查看证书信息（确认域名和有效期）
sudo openssl x509 -in /etc/letsencrypt/live/www.mmdd10.tech/fullchain.pem -noout -subject -dates
# 输出示例:
# subject=CN = www.mmdd10.tech
# notBefore=Apr 15 ...
# notAfter=Jul 14 ...    （有效期 90 天）
```

### 8.5 切换到完整 HTTPS 配置

证书就绪后，按 7.2 节分两次写入完整 HTTPS 配置：

**第一次写入**（HTTP 跳转 + HTTPS 主站前半段）：

```bash
sudo tee /etc/nginx/sites-available/miao > /dev/null << 'NGINX'
# HTTP -> HTTPS 重定向
server {
    listen 80;
    server_name www.mmdd10.tech mmdd10.tech;
    return 301 https://www.mmdd10.tech$request_uri;
}

# 裸域名 HTTPS -> www 重定向
server {
    listen 443 ssl http2;
    server_name mmdd10.tech;
    ssl_certificate /etc/letsencrypt/live/www.mmdd10.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.mmdd10.tech/privkey.pem;
    return 301 https://www.mmdd10.tech$request_uri;
}

# 主站
server {
    listen 443 ssl http2;
    server_name www.mmdd10.tech;

    ssl_certificate /etc/letsencrypt/live/www.mmdd10.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.mmdd10.tech/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    client_max_body_size 60m;
NGINX
```

**第二次写入**（追加 location 块和 gzip 配置）：

```bash
sudo tee -a /etc/nginx/sites-available/miao > /dev/null << 'NGINX'

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
        proxy_send_timeout 120s;
        proxy_buffering off;
    }

    location = /service-worker.js {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location /assets/ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1024;
    gzip_comp_level 6;
}
NGINX
```

**测试并重载**：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 8.6 验证 HTTPS

```bash
# 在服务器上测试
curl -I https://www.mmdd10.tech
# 应返回 HTTP/2 200

# 测试 HTTP 自动跳转
curl -I http://www.mmdd10.tech
# 应返回 HTTP/1.1 301 -> https://www.mmdd10.tech

# 测试裸域名跳转
curl -I http://mmdd10.tech
# 应返回 301 -> https://www.mmdd10.tech
```

然后用浏览器访问 `https://www.mmdd10.tech`，确认地址栏有锁图标。

### 8.7 配置证书自动续签

Let's Encrypt 证书有效期 90 天，Certbot 安装时已自动创建定时任务：

```bash
# 确认自动续签定时器已启用
sudo systemctl status certbot.timer
# 应显示 active (waiting)

# 手动测试续签流程（不会真正续签，只是验证流程）
sudo certbot renew --dry-run
# 应显示: Congratulations, all simulated renewals succeeded
```

如果 `certbot.timer` 未启用，手动开启：

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

> **说明**: Certbot 每天自动检查两次，证书到期前 30 天内会自动续签。续签后 Nginx 会自动加载新证书（通过 `--nginx` 插件的 deploy hook）。无需手动操作。

---

## 九、安全组 / 防火墙

在腾讯云控制台 -> 轻量服务器 -> 防火墙，添加规则：

| 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|
| TCP | 22 | 你的 IP/0.0.0.0 | SSH |
| TCP | 80 | 0.0.0.0/0 | HTTP（重定向用） |
| TCP | 443 | 0.0.0.0/0 | HTTPS |

**不要开放 3000 端口** — Node.js 只监听 127.0.0.1，由 Nginx 反代访问。

---

## 十、后续更新部署

> 前提：已按 3.1 节配置好 SSH 密钥，remote 地址为 `git@github.com:binxiao9157/Miao.git`。

### 手动更新

```bash
sudo su - miao
cd ~/app

git pull origin main
npm install
npm run build
pm2 restart miao

# 查看启动日志
pm2 logs miao --lines 20
```

### 一键部署脚本（带回滚能力）

> 脚本内容较长，分两步写入。必须在 **miao 用户**下执行。

**第一步：创建脚本前半段**

```bash
cat > /home/miao/app/deploy.sh << 'SCRIPT'
#!/bin/bash
set -e
cd /home/miao/app

PREV_COMMIT=$(git rev-parse HEAD)

echo "==> Pulling latest code (SSH)..."
git pull origin main

echo "==> Installing dependencies..."
npm install

echo "==> Building frontend..."
if ! npm run build; then
    echo "!!! Build failed, rolling back to $PREV_COMMIT ..."
    git checkout "$PREV_COMMIT"
    npm install && npm run build && pm2 restart miao
    echo "!!! Rolled back. Please check the build error."
    exit 1
fi
SCRIPT
```

**第二步：追加脚本后半段**

```bash
cat >> /home/miao/app/deploy.sh << 'SCRIPT'

echo "==> Restarting server..."
pm2 restart miao

sleep 3
if pm2 show miao | grep -q "status.*online"; then
    echo "==> Deploy success!"
    pm2 status
else
    echo "!!! Server failed to start, rolling back..."
    git checkout "$PREV_COMMIT"
    npm install && npm run build && pm2 restart miao
    echo "!!! Rolled back. Check logs: pm2 logs miao"
    exit 1
fi
SCRIPT
chmod +x /home/miao/app/deploy.sh
```

**使用方式**（在 miao 用户下执行）：

```bash
sudo su - miao
cd ~/app
./deploy.sh
```

---

## 十一、验证清单

部署完成后逐项检查：

| # | 项目 | 方法 |
|---|------|------|
| 1 | Node 运行中 | `pm2 status` -> online |
| 2 | 健康检查 | `curl http://127.0.0.1:3000/api/health` |
| 3 | Nginx 正常 | `sudo systemctl status nginx` |
| 4 | HTTPS | 浏览器访问 `https://www.mmdd10.tech` |
| 5 | 裸域名跳转 | 浏览器访问 `http://mmdd10.tech` 自动跳转到 https://www.mmdd10.tech |
| 6 | PWA 可安装 | Chrome 地址栏出现安装图标 |
| 7 | API 生效 | 尝试生成图片/视频 |
| 8 | SW 注册 | DevTools -> Application -> Service Workers |
| 9 | 无 Key 泄露 | DevTools -> Sources -> 搜索 API Key 无结果 |
| 10 | console 已剥离 | DevTools -> Console -> 页面操作无 log 输出 |
| 11 | 日志轮转 | `pm2 describe pm2-logrotate` 确认已启用 |

---

## 十二、常见问题

### Q: 访问显示 502 Bad Gateway
A: Node.js 未启动或崩溃。检查 `pm2 status` 和 `pm2 logs miao`。

### Q: API 调用报 "服务器未配置 API Key"
A: `.env` 文件中 `VOLC_API_KEY` 未生效。确认文件路径正确且 PM2 已重启：`pm2 restart miao`。

### Q: PWA 无法安装
A: 必须通过 HTTPS 访问。检查 SSL 证书是否配置成功。

### Q: 视频生成超时
A: Nginx 默认 60s 超时。已在配置中设置 `proxy_read_timeout 180s`，若仍不够可调大。

### Q: ICP 备案未完成怎么办
A: 可临时使用腾讯云香港地域的服务器（无需备案），但到火山引擎 API 的延迟会增加 30-50ms。

### Q: 裸域名 mmdd10.tech 无法访问
A: 确认 DNS 中同时添加了 `www.mmdd10.tech` 和 `mmdd10.tech` 的 A 记录，均指向服务器 IP。

### Q: 磁盘空间不足
A: 检查日志轮转是否正常：`pm2 describe pm2-logrotate`。手动清理旧日志：`pm2 flush`。
