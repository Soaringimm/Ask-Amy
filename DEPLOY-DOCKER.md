# Docker 部署指南

## 目标
将应用打包为 Docker 镜像并运行在本地 Docker 环境中，连接到共享的本地网络。

## 前置条件
- 本地已安装 Docker Desktop
- 本地已运行共享网络基础设施（`~/local`）

## 1. 创建 Dockerfile
在项目根目录创建 `Dockerfile`：

```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 2. 创建 Nginx 配置
在项目根目录创建 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

## 3. 创建 docker-compose.yml
在项目根目录创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  ask-amy:
    build: .
    container_name: ask-amy
    ports:
      - "8007:80"
    networks:
      - shared-network
    environment:
      - SEARCH_SERVICE_TOKEN=${SEARCH_SERVICE_TOKEN}

networks:
  shared-network:
    external: true
    name: local_shared-network  # 请确认 ~/local/docker-compose.infra.yml 中的网络名称
```

## 4. 部署
```bash
docker-compose up -d --build
```

## 5. 访问
打开浏览器访问 http://localhost:8007
