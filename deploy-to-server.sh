#!/bin/bash
# ============================================================
# Miao 服务器一键部署脚本
# 使用方法: bash deploy-to-server.sh
# ============================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Miao 服务器部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# ============================================================
# 配置变量（根据实际情况修改）
# ============================================================
SERVER_USER="miao"
SERVER_HOST="124.221.2.31"  # 腾讯云服务器 IP
SERVER_PORT="22"
APP_DIR="/home/miao/app"
DOMAIN="www.mmdd10.tech"
GIT_BRANCH="main"  # 部署的分支，可改为 feature/ai-provider-switching

# ============================================================
# 第一步：本地构建
# ============================================================
echo -e "${YELLOW}[1/5] 本地构建...${NC}"

cd "$(dirname "$0")"

echo "检查依赖..."
npm install

echo "构建前端..."
npm run build

echo -e "${GREEN}本地构建完成！${NC}"

# ============================================================
# 第二步：构建部署命令脚本
# ============================================================
echo -e "${YELLOW}[2/5] 生成部署命令脚本...${NC}"

DEPLOY_SCRIPT_CONTENT=$(cat << 'DEPLOY_EOF'
#!/bin/bash
# ============================================================
# Miao 远程部署执行脚本
# ============================================================
set -e

cd ~/app

# 保存之前的 commit SHA
PREV_COMMIT=$(git rev-parse HEAD)
echo "==> 当前版本: $PREV_COMMIT"

# 部署机上 public/logo 可能被手工替换过；先备份，再恢复为 Git 干净状态，
# 否则 git pull 遇到同名文件更新会因本地改动中止。
BACKUP_DIR="$HOME/app/.deploy-backups/public_$(date +%Y%m%d_%H%M%S)"
TRACKED_PUBLIC_PATHS=(public logo.png)

if ! git diff --quiet -- "${TRACKED_PUBLIC_PATHS[@]}"; then
    echo "==> 检测到 public/logo 本地改动，备份到 $BACKUP_DIR ..."
    mkdir -p "$BACKUP_DIR"
    [ -d public ] && cp -a public "$BACKUP_DIR/"
    [ -f logo.png ] && cp -a logo.png "$BACKUP_DIR/"
    git restore --staged --worktree -- "${TRACKED_PUBLIC_PATHS[@]}"
fi

# ============================================================
# 拉取最新代码
# ============================================================
echo "==> 拉取最新代码..."
git fetch origin GITHUB_HEAD_REF
git checkout GITHUB_HEAD_REF || git checkout main
git pull --ff-only origin GITHUB_HEAD_REF || git pull --ff-only origin main

# ============================================================
# 安装依赖
# ============================================================
echo "==> 安装依赖..."
npm install

# ============================================================
# 构建前端
# ============================================================
echo "==> 构建前端..."
if ! npm run build; then
    echo "!!! 构建失败，尝试回滚..."
    git checkout "$PREV_COMMIT"
    npm install && npm run build
    echo "!!! 回滚完成，请检查构建错误"
    exit 1
fi

# ============================================================
# 重启服务
# ============================================================
echo "==> 重启服务..."
pm2 restart miao

sleep 3

# ============================================================
# 验证服务状态
# ============================================================
if pm2 show miao | grep -q "status.*online"; then
    echo "==> 服务启动成功！"
    pm2 status
else
    echo "!!! 服务启动失败，尝试回滚..."
    git checkout "$PREV_COMMIT"
    npm install && npm run build && pm2 restart miao
    echo "!!! 回滚完成，查看日志: pm2 logs miao"
    exit 1
fi

# ============================================================
# 验证 API
# ============================================================
echo ""
echo "==> 验证服务..."
HEALTH_RESPONSE=$(curl -s http://127.0.0.1:3000/api/health || echo "failed")
echo "健康检查: $HEALTH_RESPONSE"

echo ""
echo "==> 部署完成！"
DEPLOY_EOF
)
DEPLOY_SCRIPT_CONTENT="${DEPLOY_SCRIPT_CONTENT//GITHUB_HEAD_REF/$GIT_BRANCH}"

# ============================================================
# 第三步：上传部署脚本到服务器
# ============================================================
echo -e "${YELLOW}[3/5] 上传部署脚本到服务器...${NC}"

# 创建临时脚本文件
TEMP_SCRIPT="/tmp/miao_deploy_$(date +%s).sh"
echo "$DEPLOY_SCRIPT_CONTENT" > "$TEMP_SCRIPT"

# 上传到服务器
scp -P "$SERVER_PORT" "$TEMP_SCRIPT" "$SERVER_USER@$SERVER_HOST:/home/miao/app/deploy.sh"

# 删除本地临时文件
rm -f "$TEMP_SCRIPT"

ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "chmod +x /home/miao/app/deploy.sh"

echo -e "${GREEN}部署脚本已上传！${NC}"

# ============================================================
# 第四步：上传 .env 文件
# ============================================================
echo -e "${YELLOW}[4/5] 检查环境变量配置...${NC}"

if [ -f ".env" ]; then
    echo "发现 .env 文件，上传到服务器..."
    scp -P "$SERVER_PORT" ".env" "$SERVER_USER@$SERVER_HOST:/home/miao/app/.env"
    ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "chmod 600 /home/miao/app/.env"
    echo -e "${GREEN}.env 已上传并设置权限${NC}"
else
    echo -e "${YELLOW}警告: 未找到 .env 文件${NC}"
    echo "请确保服务器上已有正确的 .env 配置"
fi

# ============================================================
# 第五步：显示部署说明
# ============================================================
echo -e "${YELLOW}[5/5] 准备完成！${NC}"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}部署准备完成，请确认以下信息：${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "服务器: $SERVER_USER@$SERVER_HOST:$SERVER_PORT"
echo "部署目录: $APP_DIR"
echo "域名: https://$DOMAIN"
echo "部署分支: $GIT_BRANCH"
echo ""

echo -e "${GREEN}要执行部署，请在服务器上运行以下命令：${NC}"
echo ""
echo -e "${YELLOW}  ssh $SERVER_USER@$SERVER_HOST${NC}"
echo -e "${YELLOW}  cd ~/app${NC}"
echo -e "${YELLOW}  ./deploy.sh${NC}"
echo ""

echo -e "${RED}注意: 脚本不会自动执行部署，确认无误后再手动运行！${NC}"
echo ""

# ============================================================
# 可选：自动执行部署（取消注释即可启用）
# ============================================================
# echo -e "${YELLOW}开始执行部署...${NC}"
# ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "~/app/deploy.sh"
#
# echo ""
# echo "=== 验证部署结果 ==="
# ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "pm2 status"
# ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "curl -s http://127.0.0.1:3000/api/health"
# curl -sI "https://$DOMAIN" | head -3
#
# echo ""
# echo -e "${GREEN}========================================${NC}"
# echo -e "${GREEN}部署完成！访问地址: https://$DOMAIN${NC}"
# echo -e "${GREEN}========================================${NC}"
