/**
 * IRCC Help Centre 内容抓取脚本
 * 抓取加拿大移民局帮助中心的中英文内容
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 所有主题列表
const TOPICS = [
  { id: 1, name: 'Access to Information and Privacy', name_cn: '信息获取和隐私' },
  { id: 2, name: 'Adoption', name_cn: '收养' },
  { id: 3, name: 'Application status', name_cn: '申请状态' },
  { id: 4, name: 'Applying - General', name_cn: '申请 - 一般信息' },
  { id: 5, name: 'Citizenship', name_cn: '公民身份' },
  { id: 6, name: 'Immigrating', name_cn: '移民' },
  { id: 7, name: 'Immigration representatives', name_cn: '移民代表' },
  { id: 8, name: 'Inadmissibility', name_cn: '不可入境' },
  { id: 10, name: 'Permanent Residents', name_cn: '永久居民' },
  { id: 11, name: 'Refugees', name_cn: '难民' },
  { id: 12, name: 'Replacing documents', name_cn: '补办文件' },
  { id: 13, name: 'Service standards', name_cn: '服务标准' },
  { id: 14, name: 'Sponsoring your family', name_cn: '担保家人' },
  { id: 15, name: 'Studying', name_cn: '学习' },
  { id: 16, name: 'Visiting', name_cn: '访问' },
  { id: 17, name: 'Work permits', name_cn: '工作许可' },
  { id: 18, name: 'Downloading files', name_cn: '下载文件' },
  { id: 19, name: 'Biometrics', name_cn: '生物识别' },
  { id: 20, name: 'Asylum claims', name_cn: '庇护申请' },
  { id: 22, name: 'Leaving/Returning to Canada', name_cn: '离开/返回加拿大' },
  { id: 23, name: 'Applying online', name_cn: '在线申请' },
  { id: 25, name: 'International Experience Canada', name_cn: '加拿大国际体验' },
  { id: 26, name: 'Port of Entry Letter', name_cn: '入境口岸信' },
  { id: 27, name: 'Settlement services', name_cn: '定居服务' },
  { id: 28, name: 'Caregiver Program', name_cn: '护理员计划' },
  { id: 29, name: 'Express Entry', name_cn: '快速通道' },
  { id: 31, name: 'Immigration and citizenship fraud and scams', name_cn: '移民和公民欺诈' },
  { id: 32, name: 'Changing sex or gender identifier', name_cn: '更改性别标识' },
  { id: 33, name: 'Interim Federal Health Program', name_cn: '临时联邦健康计划' },
  { id: 34, name: 'Contact us', name_cn: '联系我们' },
  { id: 35, name: 'Destination Canada', name_cn: '加拿大目的地' },
  { id: 38, name: 'Ukraine: Immigration measures', name_cn: '乌克兰：移民措施' },
  { id: 39, name: 'Gaza and the West Bank', name_cn: '加沙和西岸' },
  { id: 40, name: 'FIFA World Cup 26™', name_cn: '2026年世界杯' },
];

// 模拟抓取函数（实际需要使用真实的HTTP请求库）
async function fetchTopicContent(topicId, language = 'en') {
  const baseUrl = language === 'en'
    ? 'https://ircc.canada.ca/english/helpcentre'
    : 'https://ircc.canada.ca/francais/centre-aide';

  const url = `${baseUrl}/results-by-topic.asp?top=${topicId}`;

  console.log(`抓取: ${url}`);

  // 注意：这里需要实际的HTTP请求
  // 由于环境限制，这是示例代码
  return {
    url,
    language,
    // 实际内容需要通过HTTP请求获取
    content: `Topic ${topicId} content in ${language}`,
  };
}

// 生成知识库文章
async function generateArticles() {
  const articles = [];

  for (const topic of TOPICS) {
    console.log(`\n处理主题: ${topic.name} (${topic.name_cn})`);

    // 抓取英文内容
    const enContent = await fetchTopicContent(topic.id, 'en');

    // 抓取法文内容（如果需要）
    // const frContent = await fetchTopicContent(topic.id, 'fr');

    // 生成双语文章
    const article = {
      title: `${topic.name_cn} | ${topic.name}`,
      content: `# ${topic.name_cn}\n\n${topic.name}\n\n---\n\n## 英文说明\n\n[此处为英文内容]\n\n## 中文说明\n\n[此处为中文翻译]`,
      category: topic.name,
      source_url: `https://ircc.canada.ca/english/helpcentre/results-by-topic.asp?top=${topic.id}`,
      created_at: new Date().toISOString(),
    };

    articles.push(article);

    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return articles;
}

// 保存为JSON文件
async function saveToJson(articles) {
  const outputPath = path.join(__dirname, '../data/ircc-articles.json');
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2), 'utf-8');
  console.log(`\n✅ 已保存 ${articles.length} 篇文章到: ${outputPath}`);
}

// 生成SQL插入语句
function generateSqlInserts(articles) {
  const sqlStatements = articles.map(article => {
    const title = article.title.replace(/'/g, "''");
    const content = article.content.replace(/'/g, "''");

    return `INSERT INTO articles (title, content, created_at) VALUES ('${title}', '${content}', NOW());`;
  });

  const outputPath = path.join(__dirname, '../data/ircc-articles.sql');
  fs.writeFileSync(outputPath, sqlStatements.join('\n\n'), 'utf-8');
  console.log(`✅ 已生成SQL文件: ${outputPath}`);
}

// 主函数
async function main() {
  console.log('🚀 开始抓取 IRCC Help Centre 内容...\n');
  console.log(`共有 ${TOPICS.length} 个主题待处理\n`);

  try {
    const articles = await generateArticles();
    await saveToJson(articles);
    generateSqlInserts(articles);

    console.log('\n✅ 全部完成！');
    console.log(`\n📊 统计信息:`);
    console.log(`   - 总主题数: ${TOPICS.length}`);
    console.log(`   - 生成文章: ${articles.length}`);
    console.log(`\n📁 输出文件:`);
    console.log(`   - JSON: data/ircc-articles.json`);
    console.log(`   - SQL:  data/ircc-articles.sql`);
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

// 运行脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TOPICS, generateArticles, saveToJson };
