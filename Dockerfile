FROM node:20-alpine

# 安裝 nginx 和 supervisor（用來管理多個進程）
RUN apk add --no-cache nginx supervisor

WORKDIR /app

# 安裝 Node 依賴
COPY package.json ./
RUN npm install --production

# 複製 Discord Bot 程式
COPY bot/ ./bot/

# 複製靜態網頁
COPY public/ ./public/

# 複製設定檔
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY supervisord.conf /etc/supervisord.conf

# 建立 log 目錄
RUN mkdir -p /var/log/supervisor /run/nginx

EXPOSE 80

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
