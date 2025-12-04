# Ask Amy 咨询平台 - 设置指南

## 1. Supabase 设置

### 1.1 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com)
2. 注册并登录
3. 点击 "New Project"
4. 填写项目信息（记住数据库密码）
5. 等待项目创建完成

### 1.2 获取 API 密钥

1. 在项目页面，点击左侧菜单的 "Settings"
2. 选择 "API"
3. 复制以下信息：
   - `Project URL` (这是你的 SUPABASE_URL)
   - `anon public` key (这是你的 SUPABASE_ANON_KEY)

### 1.3 配置环境变量

在项目根目录创建 `.env` 文件：

```env
VITE_SUPABASE_URL=你的项目URL
VITE_SUPABASE_ANON_KEY=你的anon密钥
```

### 1.4 创建数据库表

在 Supabase 控制台，进入 "SQL Editor"，执行以下 SQL：

```sql
-- 创建咨询表
CREATE TABLE consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  question TEXT NOT NULL,
  deadline DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  quote TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 创建知识库文章表
CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 设置 RLS (Row Level Security)
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户插入咨询
CREATE POLICY "Anyone can insert consultations"
ON consultations FOR INSERT
TO anon
WITH CHECK (true);

-- 允许认证用户查看和更新咨询
CREATE POLICY "Authenticated users can view consultations"
ON consultations FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update consultations"
ON consultations FOR UPDATE
TO authenticated
USING (true);

-- 允许所有人查看文章
CREATE POLICY "Anyone can view articles"
ON articles FOR SELECT
TO anon, authenticated
USING (true);

-- 允许认证用户管理文章
CREATE POLICY "Authenticated users can insert articles"
ON articles FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update articles"
ON articles FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete articles"
ON articles FOR DELETE
TO authenticated
USING (true);
```

### 1.5 创建管理员账户

1. 在 Supabase 控制台，点击 "Authentication"
2. 点击 "Users"
3. 点击 "Add user" 或 "Invite user"
4. 输入管理员邮箱和密码
5. 确认创建

## 2. 运行项目

### 2.1 安装依赖

```bash
npm install
```

### 2.2 启动开发服务器

```bash
npm run dev
```

### 2.3 访问应用

- 前台：http://localhost:5173
- 管理后台：http://localhost:5173/admin/login

## 3. 支付设置

### 3.1 准备收款码

1. 准备您的微信/支付宝收款二维码图片
2. 将图片放入 `public/payment-qr.png`
3. 在知识库页面的打赏弹窗中会显示这个二维码

### 3.2 更新收款码显示

编辑 `src/pages/KnowledgeBasePage.jsx`，找到打赏弹窗部分：

```jsx
<div className="bg-gray-100 h-64 flex items-center justify-center rounded-lg mb-6">
  <img src="/payment-qr.png" alt="收款码" className="max-h-full" />
</div>
```

## 4. 部署到 Vercel

### 4.1 推送到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### 4.2 在 Vercel 部署

1. 访问 [vercel.com](https://vercel.com)
2. 登录并点击 "New Project"
3. 导入你的 GitHub 仓库
4. 在环境变量设置中添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. 点击 "Deploy"

### 4.3 配置域名（可选）

1. 在 Vercel 项目设置中点击 "Domains"
2. 添加你的自定义域名
3. 按照指示配置 DNS

## 5. 功能测试

### 5.1 测试前台功能

1. 访问首页，检查导航是否正常
2. 访问知识库页面（暂时没有文章）
3. 提交一个测试咨询

### 5.2 测试后台功能

1. 访问 `/admin/login`
2. 使用创建的管理员账户登录
3. 查看咨询列表
4. 添加报价并更新状态
5. 添加一篇测试文章
6. 返回前台查看文章是否显示

## 6. 后续优化

- [ ] 添加邮件通知功能（使用 EmailJS 或 SendGrid）
- [ ] 集成 Stripe 支付（如果需要支持加币CAD）
- [ ] 添加英文版本（多语言支持）
- [ ] 优化搜索功能（全文搜索）
- [ ] 添加分析统计功能

## 常见问题

### Q: 无法连接到 Supabase？
A: 检查 `.env` 文件中的 URL 和密钥是否正确，确保以 `VITE_` 开头。

### Q: 管理员无法登录？
A: 确保在 Supabase Authentication 中创建了用户，并且使用正确的邮箱密码。

### Q: 文章或咨询不显示？
A: 检查 Supabase 中的 RLS 策略是否正确设置。

### Q: 如何修改样式？
A: 本项目使用 Tailwind CSS，可以直接修改组件中的 className。

## 技术支持

如有问题，请查看：
- [Supabase 文档](https://supabase.com/docs)
- [Vite 文档](https://vitejs.dev)
- [React Router 文档](https://reactrouter.com)
- [Tailwind CSS 文档](https://tailwindcss.com)
