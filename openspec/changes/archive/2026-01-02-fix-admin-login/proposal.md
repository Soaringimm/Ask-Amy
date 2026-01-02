# Proposal: Fix Admin Login

## Summary
修复 admin 登录功能，使管理员能够正常访问后台。

## Background
Admin 登录页面和管理后台已存在，但由于表名不一致的 bug 导致登录失败。

## Problem
1. `AdminLogin.jsx` 查询 `profiles` 表，但实际表名是 `aa_profiles`
2. 数据库中可能没有 admin 用户

## Requirements

### REQ-1: Admin Login MUST use correct table name
AdminLogin.jsx 中的 Supabase 查询必须使用 `aa_profiles` 表。

### REQ-2: Admin user MUST exist in database
系统必须有一个有效的 admin 用户用于登录。

### REQ-3: Admin login flow MUST work end-to-end
从 `/admin/login` 输入凭据到进入 `/admin/dashboard` 的完整流程必须可用。

## Out of Scope
- 新增 admin 功能
- 修改 admin dashboard 布局
- 多 admin 用户管理
