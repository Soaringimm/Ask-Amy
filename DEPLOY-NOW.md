# 🚀 立即部署 - 3个步骤

## ✅ 已完成
- ✓ Git 仓库已初始化
- ✓ 所有文件已提交（34个文件）
- ✓ 准备好推送到 GitHub

---

## 📍 下一步：上传到 GitHub（2分钟）

### 步骤 1：创建 GitHub 仓库

1. **打开浏览器访问**：
   ```
   https://github.com/new
   ```

2. **填写仓库信息**：
   - Repository name: `consultancy-platform`（或其他名称）
   - Description: `Ask Amy - 加拿大移民咨询平台`
   - 选择 **Private**（私有）或 **Public**（公开）
   - ⚠️ **不要勾选** "Add a README file"
   - ⚠️ **不要添加** .gitignore 或 license
   - 点击 **"Create repository"**

3. **复制仓库地址**：
   创建后，GitHub 会显示一个 URL，类似：
   ```
   https://github.com/YOUR_USERNAME/consultancy-platform.git
   ```
   **请复制这个地址！**

---

### 步骤 2：连接并推送（在命令行运行）

回到命令行，运行以下命令（**替换成您的仓库地址**）：

```bash
# 1. 添加远程仓库（替换成您刚复制的地址）
git remote add origin https://github.com/YOUR_USERNAME/consultancy-platform.git

# 2. 推送代码
git branch -M main
git push -u origin main
```

如果提示输入 GitHub 用户名和密码：
- **用户名**：您的 GitHub 用户名
- **密码**：使用 Personal Access Token（不是 GitHub 密码）

> 💡 如何获取 Personal Access Token？
> 1. 访问：https://github.com/settings/tokens
> 2. 点击 "Generate new token (classic)"
> 3. 勾选 "repo" 权限
> 4. 点击 "Generate token"
> 5. 复制生成的 token（只显示一次！）

---

### 步骤 3：在 Vercel 部署（3分钟）

1. **访问 Vercel**：
   ```
   https://vercel.com/signup
   ```
   - 用 GitHub 账号登录

2. **导入项目**：
   - 点击 **"Add New..."** → **"Project"**
   - 找到您的 `consultancy-platform` 仓库
   - 点击 **"Import"**

3. **配置项目**（通常自动检测，无需修改）：
   - Framework Preset: **Vite** ✓
   - Build Command: `npm run build` ✓
   - Output Directory: `dist` ✓

4. **添加环境变量**（可选，如果还没配置 Supabase 可以跳过）：
   - 点击 **"Environment Variables"**
   - 添加：
     ```
     VITE_SUPABASE_URL = https://placeholder.supabase.co
     VITE_SUPABASE_ANON_KEY = placeholder-key-for-development
     ```

5. **点击 Deploy**！
   - 等待 2-3 分钟
   - 部署完成后，您会得到一个公网地址！

---

## 🎉 部署成功后

您会获得一个链接，类似：
```
https://consultancy-platform-xxxx.vercel.app
```

**这个链接可以分享给任何人！**

### 测试部署结果

1. 访问您的新网站
2. 点击 "知识库"
3. 应该能看到：
   - 3个分类卡片
   - 点击进入查看问题列表
   - 点击问题查看详细答案
   - 打赏功能显示收款码

---

## 🔧 如果遇到问题

### 问题1：GitHub 推送失败
**解决**：
```bash
# 检查远程仓库地址是否正确
git remote -v

# 如果地址错误，删除并重新添加
git remote remove origin
git remote add origin YOUR_CORRECT_URL
```

### 问题2：Vercel 部署失败
**检查**：
1. 查看 Vercel 部署日志
2. 确认 Build Command 是 `npm run build`
3. 确认 Output Directory 是 `dist`

### 问题3：网站显示空白
**检查**：
1. 打开浏览器开发者工具（F12）
2. 查看 Console 是否有错误
3. 检查 Network 标签看是否文件加载失败

---

## 📱 部署后的自动更新

以后修改代码后，只需：
```bash
git add .
git commit -m "更新内容描述"
git push
```

Vercel 会**自动重新部署**！

---

## 🎯 现在开始！

1. ✅ 打开 https://github.com/new 创建仓库
2. ✅ 复制仓库地址
3. ✅ 运行推送命令
4. ✅ 在 Vercel 导入项目
5. ✅ 分享您的网站给客户！

**需要帮助吗？告诉我您在哪一步遇到问题！** 🚀
