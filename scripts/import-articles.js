/**
 * 导入文章到 Supabase 数据库
 * 使用方法：node scripts/import-articles.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 从环境变量读取 Supabase 配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误：请先配置 .env 文件中的 Supabase 密钥');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importArticles() {
  console.log('🚀 开始导入文章...\n');

  try {
    // 读取示例文章
    const articlesPath = path.join(__dirname, '../data/sample-articles.json');
    const articlesData = fs.readFileSync(articlesPath, 'utf-8');
    const articles = JSON.parse(articlesData);

    console.log(`📚 找到 ${articles.length} 篇文章待导入\n`);

    let successCount = 0;
    let failCount = 0;

    for (const article of articles) {
      try {
        const { data, error } = await supabase
          .from('articles')
          .insert([{
            title: article.title,
            content: article.content,
          }]);

        if (error) throw error;

        successCount++;
        console.log(`✅ 已导入: ${article.title}`);
      } catch (error) {
        failCount++;
        console.error(`❌ 导入失败: ${article.title}`);
        console.error(`   错误: ${error.message}`);
      }
    }

    console.log(`\n📊 导入完成！`);
    console.log(`   - 成功: ${successCount} 篇`);
    console.log(`   - 失败: ${failCount} 篇`);

    if (failCount > 0) {
      console.log(`\n💡 提示：如果导入失败，请检查：`);
      console.log(`   1. Supabase 数据库是否已创建 articles 表`);
      console.log(`   2. .env 文件中的密钥是否正确`);
      console.log(`   3. RLS 策略是否正确配置`);
    }

  } catch (error) {
    console.error('❌ 导入过程出错:', error.message);
    process.exit(1);
  }
}

// 运行导入
importArticles();
