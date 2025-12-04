# IRCC 知识库导入指南

## 📦 已准备的内容

### 1. 示例文章（sample-articles.json）
已经为您准备好3篇精选的双语文章：
- ✅ **工作许可常见问题**（15个问答）
- ✅ **学习许可指南**
- ✅ **快速通道（Express Entry）指南**

### 2. 主题列表（ircc-topics-list.json）
包含10个最热门的移民主题，包括中英文标题和链接：
- Application status（申请状态）
- Citizenship（公民身份）
- Sponsoring your family（担保家人）
- Studying（学习许可）
- Visiting（访问签证）
- Work permits（工作许可）
- Express Entry（快速通道）
- Permanent Residents（永久居民）
- 等等...

## 🚀 快速导入（3步完成）

### 方法 1：使用导入脚本（推荐）

**步骤 1：确保已配置 Supabase**
```bash
# 检查 .env 文件是否包含真实的 Supabase 密钥
cat .env
```

**步骤 2：运行导入脚本**
```bash
node scripts/import-articles.js
```

**步骤 3：验证导入**
- 访问 http://localhost:5173/knowledge-base
- 应该能看到3篇新文章！

### 方法 2：手动导入（通过管理后台）

1. 启动开发服务器：`npm run dev`
2. 访问：http://localhost:5173/admin/login
3. 登录管理后台
4. 点击"知识库管理" → "添加新文章"
5. 复制粘贴 `sample-articles.json` 中的内容

### 方法 3：直接执行 SQL

在 Supabase SQL Editor 中执行：

```sql
INSERT INTO articles (title, content) VALUES
(
  '加拿大工作许可 - 常见问题 | Work Permits FAQ',
  '# 加拿大工作许可常见问题

## 什么算是工作？

在加拿大，"工作"是指任何有报酬或获得利益的活动...'
);

-- 重复添加其他文章...
```

## 📋 完整的33个主题列表

想要所有主题的内容？这些是 IRCC Help Centre 的全部分类：

1. Access to Information and Privacy
2. Adoption
3. Application status
4. Applying - General
5. Citizenship
6. Immigrating
7. Immigration representatives
8. Inadmissibility
9. Permanent Residents
10. Refugees
11. Replacing documents
12. Service standards
13. Sponsoring your family
14. Studying
15. Visiting
16. Work permits
17. Downloading files
18. Biometrics
19. Asylum claims
20. Leaving/Returning to Canada
21. Applying online
22. International Experience Canada
23. Port of Entry Letter
24. Settlement services
25. Caregiver Program
26. Express Entry
27. Immigration fraud and scams
28. Changing sex or gender identifier
29. Interim Federal Health Program
30. Contact us
31. Destination Canada
32. Ukraine: Immigration measures
33. Gaza and the West Bank

## 🔧 自定义抓取更多内容

### 使用 WebFetch 抓取特定主题

想要抓取更多主题？您可以使用 WebFetch 工具：

```javascript
// 例如：抓取"Citizenship"主题
fetch('https://ircc.canada.ca/english/helpcentre/results-by-topic.asp?top=5')
```

### 修改 scrape-ircc.js 脚本

`scripts/scrape-ircc.js` 包含所有33个主题的定义。您可以：

1. 取消注释实际的 HTTP 请求代码
2. 添加 axios 或 node-fetch 依赖
3. 实现真实的内容抓取逻辑

## ⚠️ 重要提示

### 版权和使用
- IRCC Help Centre 的内容属于加拿大政府
- 建议用于**教育和信息目的**
- 如果商业使用，请：
  - 注明来源
  - 考虑获得官方许可
  - 定期更新内容以保持准确性

### 内容维护
- 移民政策会频繁变化
- 建议每季度更新一次知识库
- 添加"最后更新日期"字段

## 💡 下一步建议

### 1. 扩展知识库
- 添加更多主题（从33个中选择）
- 加入常见案例分析
- 创建办理流程图解

### 2. 优化内容
- 添加目录导航
- 加入关键词标签
- 实现全文搜索

### 3. 个性化服务
- 基于知识库提供初步咨询
- 识别复杂案例推荐付费咨询
- 跟踪热门问题，优化内容

## 📞 需要帮助？

如果需要：
- 抓取更多主题内容
- 自动化批量导入
- 中文翻译优化
- 内容结构调整

随时告诉我！

---

**现在您的知识库已经有3篇高质量的双语文章了！** 🎉
