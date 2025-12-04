# 快速上手指南

## 🎉 恭喜！您的咨询平台 MVP 已经搭建完成

## 📦 项目已包含的功能

### ✅ 前台页面
1. **首页** - 展示服务介绍和导航
2. **知识库页面** - 文章列表、搜索、打赏功能
3. **咨询页面** - 提交个性化咨询表单

### ✅ 后台管理
1. **管理员登录** - 安全的身份认证
2. **咨询管理** - 查看、报价、更新咨询状态
3. **知识库管理** - 添加、删除文章

### ✅ 技术实现
- React + Vite + Tailwind CSS
- Supabase (数据库 + 认证)
- React Router (路由)
- 响应式设计

## 🚀 接下来的 3 个步骤

### 步骤 1: 创建 Supabase 项目（10分钟）

1. 访问 https://supabase.com 并注册
2. 创建新项目
3. 在 SQL Editor 中执行 `SETUP.md` 中的数据库脚本
4. 在 Authentication 中创建管理员账户
5. 复制 API 密钥到 `.env` 文件

### 步骤 2: 本地测试（5分钟）

```bash
# 1. 创建 .env 文件
cp .env.example .env

# 2. 编辑 .env，填入 Supabase 密钥
# VITE_SUPABASE_URL=你的URL
# VITE_SUPABASE_ANON_KEY=你的密钥

# 3. 启动开发服务器
npm run dev

# 4. 访问 http://localhost:5173
```

### 步骤 3: 部署到 Vercel（5分钟）

```bash
# 1. 推送到 GitHub
git init
git add .
git commit -m "Initial commit: Ask Amy consultancy platform"
git branch -M main
# 添加你的 GitHub 仓库
git remote add origin YOUR_REPO_URL
git push -u origin main

# 2. 在 Vercel.com 导入项目
# 3. 添加环境变量（同 .env 文件）
# 4. 点击部署
```

## 📱 添加收款码

将您的微信/支付宝收款码保存为图片：
```bash
# 放到 public 目录
public/payment-qr.png
```

然后编辑 `src/pages/KnowledgeBasePage.jsx`，更新打赏弹窗部分：
```jsx
<img src="/payment-qr.png" alt="收款码" className="max-h-full" />
```

## 🧪 功能测试清单

### 前台测试
- [ ] 访问首页，查看布局和导航
- [ ] 点击"浏览知识库"（暂时为空，正常）
- [ ] 点击"预约咨询"，填写并提交表单
- [ ] 查看提交成功确认页面

### 后台测试
- [ ] 访问 `/admin/login`
- [ ] 使用 Supabase 创建的账户登录
- [ ] 查看咨询列表（应该能看到刚才提交的测试咨询）
- [ ] 点击"添加报价"，输入报价信息并保存
- [ ] 更新咨询状态为"已报价"
- [ ] 切换到"知识库管理"标签
- [ ] 点击"添加新文章"，创建一篇测试文章
- [ ] 返回前台知识库页面，查看新文章是否显示

## 🎨 自定义建议

### 更改品牌名称
全局搜索 "Ask Amy" 并替换为您的品牌名

### 调整颜色主题
编辑 `tailwind.config.js` 中的 primary 颜色：
```js
colors: {
  primary: {
    500: '#3b82f6',  // 主色调
    600: '#2563eb',  // 深色
    // ...
  }
}
```

### 添加网站图标
替换 `public/vite.svg` 为您的 logo

## 📊 当前限制

1. **支付**: 需要用户手动扫码，没有自动确认
2. **邮件**: 需要手动发送邮件通知客户
3. **语言**: 仅支持简体中文
4. **搜索**: 前端简单搜索（足够 MVP 使用）

## 🔧 后续升级选项

想要更多功能？可以考虑：
- 自动邮件通知 (EmailJS/SendGrid)
- Stripe 支付集成
- 英文版本
- 支付凭证上传
- 高级搜索功能
- 数据分析面板

## ❓ 常见问题

**Q: Supabase 需要付费吗？**
A: 免费套餐足够 MVP 使用（500MB 数据库，50GB 流量）

**Q: Vercel 需要付费吗？**
A: 个人项目完全免费

**Q: 如何修改页面内容？**
A: 所有页面都在 `src/pages/` 目录，直接编辑 JSX 文件

**Q: 如何添加新功能？**
A: 参考现有页面代码结构，创建新组件即可

## 📞 需要帮助？

- 查看详细文档: [SETUP.md](./SETUP.md)
- 查看项目说明: [README.md](./README.md)
- Supabase 文档: https://supabase.com/docs
- React 文档: https://react.dev

---

**祝您的咨询平台运营顺利！** 🎉
