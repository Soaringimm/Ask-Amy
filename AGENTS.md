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
