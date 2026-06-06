# Script Chat Player / 双演员剧本对话播放器

一个本地运行的 MVP，用于把双人剧本转换成聊天式对话界面。支持粘贴或上传剧本、识别两个角色、设置头像与左右位置、按顺序播放台词、编辑台词、保存项目，并导出 TXT / Markdown / JSON。

## 技术栈

- React + Vite + TypeScript
- Zustand 状态管理
- CSS 原生样式
- Tauri 配置骨架
- 浏览器 localStorage 保存项目，JSON 文件导入/导出

当前环境未安装 Rust，因此这里已经提供 Tauri 目录和命令脚本，但桌面打包需要先安装 Rust 和 Tauri 所需系统依赖。

## 安装依赖

```bash
npm install
```

## 本地启动

```bash
npm run dev
```

## 前端构建

```bash
npm run build
```

## Tauri 开发与打包

安装 Rust 后执行：

```bash
npm run tauri:dev
npm run tauri:build
```

## 支持的剧本格式

第一版支持每行一条台词：

```text
角色名：台词内容
角色名: 台词内容
```

支持 `.txt`、`.md`、`.json` 文本文件。无冒号的行会作为备注，不进入主对话流。第一版仅支持两个角色。

## 示例剧本

```text
主播：大家好，欢迎来到今天的直播间。
助理：今天我们给大家带来了什么产品？
主播：今天给大家介绍一款非常可爱的白色猫咪毛绒玩偶。
助理：它适合多大的小朋友？
主播：适合 3 岁以上儿童，也很适合作为生日礼物。
助理：这个玩偶的手感怎么样？
主播：它是短毛绒材质，摸起来柔软顺滑，抱起来很治愈。
助理：可以放在哪些场景里？
主播：可以放在床头、沙发、书桌旁，也可以作为拍照道具。
助理：听起来真的很适合送人。
主播：是的，它既可爱又实用，非常适合喜欢毛绒玩具的人。
```

## 功能说明

- 首页：新建项目、打开 JSON 项目、查看最近项目
- 新建项目页：项目名校验
- 剧本导入页：粘贴文本、上传文本文件、解析角色和台词
- 角色设置页：修改角色名、上传头像、切换左右位置、设置气泡颜色
- 播放编辑页：聊天气泡展示、播放/暂停/上一句/下一句/重播、速度切换、自动滚动
- 台词编辑：修改、删除、新增、复制、切换角色
- 保存与打开：项目保存到 localStorage，JSON 导出后可再次打开
- 导出：TXT、Markdown、JSON

## 主要文件

- `src/types/project.ts`：核心数据结构
- `src/utils/parseScript.ts`：剧本解析
- `src/utils/playbackTime.ts`：播放停留时间计算
- `src/utils/fileStorage.ts`：项目保存与打开
- `src/utils/exportProject.ts`：TXT / Markdown / JSON 导出
- `src/store/projectStore.ts`：项目与播放状态
- `src/components/`：头像、气泡、播放控件、项目头部、台词列表
- `src/pages/`：五个核心页面

## 当前限制

- localStorage 是浏览器 MVP 保存方式；真正写入本地项目文件夹可在 Tauri 文件系统权限配置完成后接入。
- 头像以 Data URL 保存在项目结构里，便于 JSON 恢复。
- 当前机器缺 Rust，无法在本环境完成 Tauri 桌面包构建。

## 后续计划

- 接入 Tauri 文件选择器和文件系统 API
- 保存为项目文件夹结构：`project.json` + `assets/`
- 增加截图导出和长图导出
- 支持 docx 导入与更多剧本格式
