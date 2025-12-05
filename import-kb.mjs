import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function importKnowledgeBase() {
  try {
    console.log('📚 开始导入知识库...')

    const data = JSON.parse(
      fs.readFileSync('./public/data/knowledge-base.json', 'utf-8')
    )

    for (const category of data.categories) {
      console.log(`\n📂 导入分类: ${category.title_cn}`)

      const { data: newCategory, error: catError } = await supabase
        .from('kb_categories')
        .insert({
          title_cn: category.title_cn,
          title_en: category.title_en,
          icon: category.icon,
          description: category.description
        })
        .select()
        .single()

      if (catError) {
        console.error('❌ 分类导入失败:', catError)
        continue
      }

      console.log(`✅ 分类已导入，ID: ${newCategory.id}`)

      for (const question of category.questions) {
        const { error: qError } = await supabase
          .from('kb_questions')
          .insert({
            category_id: newCategory.id,
            question_cn: question.question_cn,
            question_en: question.question_en,
            answer_cn: question.answer_cn,
            answer_en: question.answer_en,
            source: 'imported'
          })

        if (qError) {
          console.error('❌ 问题导入失败:', qError)
        } else {
          console.log(`  ✓ ${question.question_cn}`)
        }
      }
    }

    console.log('\n🎉 知识库导入完成！')
  } catch (error) {
    console.error('❌ 导入失败:', error)
  }
}

importKnowledgeBase()
