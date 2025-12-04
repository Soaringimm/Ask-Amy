# Ask Amy - 专业咨询服务平台

一个基于 React + Supabase 的知识变现平台，支持知识库浏览和个性化付费咨询。

## 功能特性

### 前台功能
- ✅ **知识库浏览**：搜索和查看专业建议文章
- ✅ **自愿打赏**：支持微信/支付宝打赏
- ✅ **个性化咨询**：提交咨询请求并获得定制报价
- ✅ **无需注册**：Guest 用户只需提供姓名和邮箱

### 后台管理
- ✅ **咨询管理**：查看所有咨询、添加报价、更新状态
- ✅ **知识库管理**：添加、编辑、删除文章
- ✅ **安全认证**：管理员登录系统

## 技术栈

- **前端**: React 18 + Vite
- **样式**: Tailwind CSS
- **路由**: React Router v6
- **后端**: Supabase (PostgreSQL + Auth + Storage)
- **图标**: React Icons
- **日期处理**: date-fns

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并填入你的 Supabase 信息：

```env
VITE_SUPABASE_URL=你的supabase项目URL
VITE_SUPABASE_ANON_KEY=你的supabase匿名密钥
```

### 3. 设置 Supabase 数据库

查看 [SETUP.md](./SETUP.md) 获取详细的数据库配置说明。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

## 项目结构

```
src/
├── components/      # 可复用组件
├── layouts/         # 布局组件
│   └── MainLayout.jsx
├── pages/           # 页面组件
│   ├── HomePage.jsx
│   ├── KnowledgeBasePage.jsx
│   ├── ConsultationPage.jsx
│   ├── AdminLogin.jsx
│   └── AdminDashboard.jsx
├── lib/             # 工具库
│   └── supabase.js  # Supabase 客户端
├── App.jsx          # 路由配置
└── main.jsx         # 入口文件
```

## 部署

### 部署到 Vercel（推荐）

1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量
4. 点击部署

详细步骤请查看 [SETUP.md](./SETUP.md)

## 路由说明

- `/` - 首页
- `/knowledge-base` - 知识库
- `/consultation` - 个性化咨询
- `/admin/login` - 管理员登录
- `/admin/dashboard` - 管理后台

## 咨询流程

1. 用户在前台填写咨询表单
2. 管理员在后台查看咨询，添加报价（例如：书面回复 - $50 CAD）
3. 管理员手动发送邮件通知客户报价
4. 客户确认并支付
5. 管理员更新状态为"已支付"，完成咨询

## 支付方式

当前版本支持：
- 微信/支付宝收款码展示
- 用户手动扫码支付

## 后续计划

- [ ] 集成邮件通知（EmailJS / SendGrid）
- [ ] 集成 Stripe 支付（支持加币 CAD）
- [ ] 多语言支持（中英文切换）
- [ ] 支付凭证上传功能
- [ ] 数据统计和分析面板

## License

MIT

## 支持

如有问题，请查看 [SETUP.md](./SETUP.md) 或提交 Issue。
