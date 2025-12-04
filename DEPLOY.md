# 部署指南 - 让您的网站上线

## 🎯 目标
将您的咨询平台部署到公网，让客户可以访问

## 🚀 方案A：Vercel 部署（推荐，最简单）

### 准备工作
- ✅ 您的网站已经在本地运行成功
- ✅ 知识库内容已经准备好
- ✅ 收款码已经上传

### 第1步：推送到 GitHub

```bash
# 1. 初始化 Git 仓库（如果还没有）
git init

# 2. 添加所有文件
git add .

# 3. 创建第一个提交
git commit -m "Initial commit: Ask Amy consultancy platform"

# 4. 创建 GitHub 仓库
# 访问 https://github.com/new
# 创建一个新的私有仓库（推荐）或公开仓库
# 仓库名称建议：consultancy-platform

# 5. 关联远程仓库（替换成您的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/consultancy-platform.git

# 6. 推送代码
git branch -M main
git push -u origin main
```

### 第2步：在 Vercel 部署

1. **访问 Vercel**
   - 打开 https://vercel.com
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "Add New..." → "Project"
   - 选择您刚创建的 GitHub 仓库
   - 点击 "Import"

3. **配置项目**
   - **Project Name**: 输入您的网站名称（如 ask-amy）
   - **Framework Preset**: Vite（自动检测）
   - **Root Directory**: ./
   - **Build Command**: `npm run build`（自动填充）
   - **Output Directory**: `dist`（自动填充）

4. **添加环境变量**（重要！）
   - 点击 "Environment Variables"
   - 添加以下变量：
     ```
     VITE_SUPABASE_URL = 你的Supabase URL
     VITE_SUPABASE_ANON_KEY = 你的Supabase密钥
     ```
   - 注意：如果还没配置 Supabase，可以先用占位符

5. **部署**
   - 点击 "Deploy"
   - 等待 2-3 分钟

6. **完成！**
   - 部署成功后，您会获得一个链接
   - 类似：https://ask-amy.vercel.app
   - 这个链接可以分享给任何人！

### 第3步：绑定自定义域名（可选）

如果您有自己的域名（如 www.askamy.ca）：

1. 在 Vercel 项目设置中
2. 点击 "Domains"
3. 添加您的域名
4. 按照指示在域名注册商处配置 DNS

---

## 🚀 方案B：Netlify 部署（备选方案）

### 步骤类似 Vercel：
1. 访问 https://netlify.com
2. 用 GitHub 登录
3. "Add new site" → "Import an existing project"
4. 选择您的 GitHub 仓库
5. Build command: `npm run build`
6. Publish directory: `dist`
7. 添加环境变量
8. Deploy

---

## 📱 部署后的功能

### ✅ 立即可用
- 知识库浏览（本地 JSON 数据）
- 分类和问题导航
- 搜索功能
- 打赏二维码展示
- 咨询表单（提交会失败，需要 Supabase）

### ⏳ 需要配置 Supabase 后可用
- 提交咨询功能
- 管理后台登录
- 文章管理

---

## 🔧 常见问题

### Q: 部署后网站是空白的？
**A**: 检查浏览器控制台，可能是：
1. 环境变量配置错误
2. 文件路径问题
3. 清除缓存并刷新

### Q: 知识库显示不出来？
**A**: 确保 `public/data/knowledge-base.json` 文件存在

### Q: 收款码显示不出来？
**A**: 确保 `public/payment-qr.png` 文件已上传

### Q: 可以先不配置 Supabase 就部署吗？
**A**: 可以！知识库功能完全可用，只是咨询提交和管理后台暂时无法使用

### Q: 每次修改代码都需要重新部署吗？
**A**: 不需要！推送到 GitHub 后，Vercel 会自动部署

---

## 🎯 快速部署命令总结

```bash
# 一键部署脚本
git init
git add .
git commit -m "Deploy consultancy platform"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main

# 然后在 Vercel 网站上导入项目即可
```

---

## 📞 需要帮助？

如果部署过程中遇到问题：
1. 检查 Vercel 的部署日志
2. 确保所有文件都已提交到 Git
3. 验证 `package.json` 中的脚本是否正确

---

**准备好部署了吗？让我们开始！** 🚀
