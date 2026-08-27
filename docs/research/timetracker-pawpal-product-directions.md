# TimeTracker 与 PawPal 产品方向研究

研究日期：2026-08-27

## 结论

下一阶段建议新建独立的 **Pause & Hydrate（休息与饮水）** 工具，而不是继续向 CoreHour 塞入提醒、宠物和分心检测。

- CoreHour 保持“计划、记录、修正、复盘时间”的单一职责。TimeTracker 值得借鉴的下一项能力是把**计划时段**与**实际会话**并列显示，并允许显式转为实际记录。
- Pause & Hydrate 负责“休息、饮水、稍后提醒、今日静音和完成次数”。它只需知道 CoreHour 当前是否在专注，以及专注何时结束，不共享或复制 CoreHour 的计时状态。
- 日/月待办属于第三个领域。除非用户明确需要个人计划管理，否则暂不创建 DayPlan，也不把任务管理器附加到 CoreHour。

## 两个项目实际做了什么

### TimeTracker

TimeTracker 是 Windows 单机时间追踪器。停止计时后，用户补充分类和任务描述；实际会话保存为 `sessions`。应用另有独立的 `plans`、每日待办和月度待办表，并用 `app_state` 保存窗口和偏好状态。[计时流程](https://github.com/Evelyn-rgb-debug/TimeTracker/blob/e527f22d582eb0cca83a8dcae03edb8847665c63/Windows/main.py#L4939-L4960) [SQLite 表结构](https://github.com/Evelyn-rgb-debug/TimeTracker/blob/e527f22d582eb0cca83a8dcae03edb8847665c63/Windows/main.py#L677-L753)

它的月/周/日历同时渲染实际会话和计划时段，支持添加/编辑计划、移动或缩放项目、复制、删除与撤销；统计按日/周/月和分类汇总。[日历模型](https://github.com/Evelyn-rgb-debug/TimeTracker/blob/e527f22d582eb0cca83a8dcae03edb8847665c63/Windows/main.py#L3018-L3113) [日历操作绑定](https://github.com/Evelyn-rgb-debug/TimeTracker/blob/e527f22d582eb0cca83a8dcae03edb8847665c63/Windows/main.py#L4635-L4698) [编辑与撤销](https://github.com/Evelyn-rgb-debug/TimeTracker/blob/e527f22d582eb0cca83a8dcae03edb8847665c63/Windows/main.py#L5237-L5459)

每日待办会把未完成事项带到后续日期，月度待办也会向后显示；这是一套任务生命周期，而非时间记录的附属字段。[待办读取与延续](https://github.com/Evelyn-rgb-debug/TimeTracker/blob/e527f22d582eb0cca83a8dcae03edb8847665c63/Windows/main.py#L884-L987)

### PawPal

PawPal 是桌面健康陪伴应用，不是时间追踪器。透明置顶宠物与独立设置窗口提供休息、饮水和定长专注提醒，并通过托盘/右键菜单控制。[README](https://github.com/zebangeth/PawPal/blob/d91b01764a7b33c6f4865dda35cc321845fcc3fd/README.md) [窗口与托盘菜单](https://github.com/zebangeth/PawPal/blob/d91b01764a7b33c6f4865dda35cc321845fcc3fd/src/main/menus.ts)

它最有价值的是提醒闭环：休息提醒提供“完成 / 稍后 / 今日静音”，饮水提醒提供“完成 / 稍后”；完成后立即切换宠物状态并增加当天计数。[提醒与反馈流程](https://github.com/zebangeth/PawPal/blob/d91b01764a7b33c6f4865dda35cc321845fcc3fd/src/main/main.ts#L935-L1131) [气泡操作界面](https://github.com/zebangeth/PawPal/blob/d91b01764a7b33c6f4865dda35cc321845fcc3fd/src/renderer/src/components/PetView.tsx)

其数据只有设置、宠物/阻塞状态以及 `breaksTaken`、`watersLogged`、`focusMinutes`、`focusWarnings` 等按日聚合值，没有可编辑的会话、活动或标签。[共享数据模型](https://github.com/zebangeth/PawPal/blob/d91b01764a7b33c6f4865dda35cc321845fcc3fd/src/shared/types.ts) [按日统计存储](https://github.com/zebangeth/PawPal/blob/d91b01764a7b33c6f4865dda35cc321845fcc3fd/src/main/statsStore.ts)

## 可复用的产品思路

| 思路 | 归属 | 建议 |
|---|---|---|
| 计划时段与实际会话分离 | CoreHour | 计划块使用不同视觉语义；完成后由用户显式转为实际会话，不能自动污染统计 |
| 周视图与直接编辑 | CoreHour | 复用现有 Timeline 和编辑器，先做周览，再按真实需求增加拖拽/缩放 |
| 休息、饮水周期 | 独立 Pause & Hydrate | 每项可启停并设置间隔，提供完成、稍后、今日静音 |
| 专注结束后的休息建议 | CoreHour → Pause & Hydrate 事件 | CoreHour 只发布结束事件；Pause & Hydrate 决定是否提醒 |
| 专注中延后健康提醒 | Pause & Hydrate 读取 CoreHour 状态 | 延后而非丢弃，不创建第二套专注计时器 |
| 每日健康计数 | Pause & Hydrate | 记录带时间戳的完成事件，再聚合展示，避免只存不可审计的计数器 |
| 每日/月度待办 | 潜在 DayPlan | 与会话分开；有明确用户需求后再立项 |
| 宠物/陪伴反馈 | 后续外观层 | 可以响应跨工具事件，但不是 Wellbeing MVP 的前置条件 |

## 不应复制的模式

### TimeTracker

- `main.py` 约 5500 行，数据库、计时、绘制、日历、统计、托盘和启动逻辑集中在同一控制器；EfficiencyMemo 应保留现有 feature、shared/UI 和 Tauri command 边界。[单文件主实现](https://github.com/Evelyn-rgb-debug/TimeTracker/blob/e527f22d582eb0cca83a8dcae03edb8847665c63/Windows/main.py)
- 表结构通过运行期 `PRAGMA table_info` 和条件 `ALTER TABLE` 演进，且会话写入仅把负时长压成零，没有数据库约束或重叠保护；不要替代 EfficiencyMemo 的版本化迁移和现有校验。[迁移与会话写入](https://github.com/Evelyn-rgb-debug/TimeTracker/blob/e527f22d582eb0cca83a8dcae03edb8847665c63/Windows/main.py#L741-L783)
- 仓库直接保存 `build/`、`dist/`、压缩包和 `__pycache__`；这些产物不应进入 EfficiencyMemo 远程仓库。[Windows 目录](https://github.com/Evelyn-rgb-debug/TimeTracker/tree/e527f22d582eb0cca83a8dcae03edb8847665c63/Windows)

### PawPal

- `main.ts` 用大量进程级可变变量和定时器同时管理宠物、提醒、专注与窗口；不应移植到 Tauri/SQLite 架构。[主进程实现](https://github.com/zebangeth/PawPal/blob/d91b01764a7b33c6f4865dda35cc321845fcc3fd/src/main/main.ts)
- 取消专注也会累计至少一分钟，且截止时间主要是运行期状态；这不满足 CoreHour 对准确、可恢复时间记录的要求。[专注停止逻辑](https://github.com/zebangeth/PawPal/blob/d91b01764a7b33c6f4865dda35cc321845fcc3fd/src/main/main.ts#L1012-L1068)
- 分心检测依赖 macOS AppleScript、辅助功能权限和每三秒前台窗口轮询，Windows 明确不支持；其隐私、跨平台与能耗成本都不适合作为下一阶段。[检测实现](https://github.com/zebangeth/PawPal/blob/d91b01764a7b33c6f4865dda35cc321845fcc3fd/src/main/distraction.ts) [平台限制](https://github.com/zebangeth/PawPal/blob/d91b01764a7b33c6f4865dda35cc321845fcc3fd/README.md#L195-L208)
- 宠物 GIF 的外部再分发授权并不明确，不能复制素材；未来如做陪伴层，应使用自有或许可清晰的资源。[资产许可](https://github.com/zebangeth/PawPal/blob/d91b01764a7b33c6f4865dda35cc321845fcc3fd/ASSET_LICENSE.md)

## 下一阶段立项建议

### Pause & Hydrate MVP（推荐立即推进）

1. 新增独立工具入口，包含“休息”和“饮水”两类提醒。
2. 每类支持启停、间隔、完成、稍后提醒和今日静音。
3. 完成行为保存为带时间戳的本地事件；Today 展示当天次数和下一次提醒时间。
4. CoreHour 活跃时延后提醒，CoreHour 结束后可提示休息；不新增专注计时器。
5. 使用系统通知和应用内轻提示；首期不做宠物、皮肤、分心检测或复杂趋势。

### 后续候选

1. **CoreHour Plan vs Actual**：计划块、实际块、显式完成/转录和周览。
2. **Pause & Hydrate 周趋势与安静时段**：当事件模型稳定且用户确实需要复盘时再增加。
3. **DayPlan**：只有待办和滚动计划需求被确认后，才作为独立工具立项。

这一路径保留了两个项目最有价值的行为创意，同时避免把 EfficiencyMemo 变成单体任务管理器或复制一套不准确的第二计时器。
