<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->
## Answer style
- 不需要输出太多中间过程，尽可能简明而要
## Temp files
- all temp files should be in the project directory's tmp sub folder

## Server Access Policy
- 访问服务器的方式是只读，绝对不允许修改任何内容
- 如果需要修改，只能提出修改方案

---

## 🧠 记忆架构

**每次 session 启动：** 读 `SESSION-STATE.md` 恢复工作上下文（如果存在）。

**三层记忆：**
- `MEMORY.md` — 长期记忆（P0/P1/P2 标签）
- `memory/YYYY-MM-DD.md` — 每日日志
- `SESSION-STATE.md` — 工作缓冲区（防压缩丢失）

**SESSION-STATE.md 刷写规则：**
- 对话超过 20 轮 → 主动写入关键状态
- 复杂任务进行中 → 立即写入进度
- 压缩发生后 → 第一件事读取恢复

## 🌐 共享知识
读 `~/.openclaw/shared/` 获取跨 agent 共享信息：
- `RULES.md` — 共享规则（记录规则、安全规则、Git workflow）
- `INFRA.md` — 基础设施信息
- `PROJECTS.md` — 项目详情
