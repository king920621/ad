
FROM nginx:alpine

# 安裝 curl 用於健康檢查
RUN apk add --no-cache curl

# 複製自定義 Nginx 配置
COPY nginx.conf /etc/nginx/nginx.conf

# 複製網站文件和驗證文件
COPY index.html /usr/share/nginx/html/index.html

# 創建健康檢查端點
RUN echo "OK" > /usr/share/nginx/html/health

# 暴露端口
EXPOSE 80 8000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 啟動 Nginx
CMD ["nginx", "-g", "daemon off;"]
