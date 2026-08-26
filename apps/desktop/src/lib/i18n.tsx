import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "en-US" | "zh-CN";

type MessageValues = Record<string, string | number>;

const LOCALE_KEY = "efficiency-memo-locale";

const messages: Record<Locale, Record<string, string>> = {
  "en-US": {
    "app.name": "EfficiencyMemo",
    "app.loading": "Loading tool...",
    "nav.workspace": "Workspace",
    "nav.tools": "Tools",
    "nav.settings": "Settings",
    "nav.appearance": "Appearance",
    "nav.lightMode": "Light mode",
    "nav.darkMode": "Dark mode",
    "nav.switchToLight": "Switch to light mode",
    "nav.switchToDark": "Switch to dark mode",
    "nav.backToDashboard": "Back to dashboard",
    "nav.openMenu": "Open menu",
    "nav.collapseSidebar": "Collapse sidebar",
    "nav.expandSidebar": "Expand sidebar",
    "nav.language": "Language",
    "nav.switchLanguage": "Switch language",
    "nav.currentEnglish": "English",
    "nav.currentChinese": "Simplified Chinese",
    "nav.coreHour": "CoreHour",
    "nav.coreHourDescription": "Track focused time with lightweight check-ins",
    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Your personal tool gallery",
    "dashboard.open": "Open",
    "dashboard.noTools": "No tools available yet",
    "dashboard.noToolsDescription": "Tools will appear here once they are registered in the system.",
    "coreHour.timer": "Timer",
    "coreHour.history": "History",
    "coreHour.tags": "Tags",
    "coreHour.settings": "Settings",
    "coreHour.focusSession": "Focus session",
    "coreHour.checkInDue": "Check-in due",
    "coreHour.paused": "Paused",
    "coreHour.running": "Running",
    "coreHour.ready": "Ready",
    "coreHour.start": "Start",
    "coreHour.pause": "Pause",
    "coreHour.end": "End",
    "coreHour.continue": "Continue",
    "coreHour.navigation": "CoreHour navigation",
    "coreHour.whatWereYouDoing": "What were you doing?",
    "coreHour.recordLast": "Record the last {duration}.",
    "coreHour.createTag": "Create a tag below to categorize this interval, or skip it.",
    "coreHour.note": "Note",
    "coreHour.optional": "optional",
    "coreHour.saveCheckIn": "Save check-in",
    "coreHour.skip": "Skip",
    "coreHour.currentSession": "Current session",
    "coreHour.intervalHint": "Check in every {minutes} minutes. Paused time is excluded.",
    "coreHour.historySubtitle": "{minutes} min recorded on {date}",
    "coreHour.exportRange": "Export range",
    "coreHour.last7Days": "Last 7 days",
    "coreHour.last30Days": "Last 30 days",
    "coreHour.allTime": "All time",
    "coreHour.exportCsv": "Export CSV",
    "coreHour.date": "Date",
    "coreHour.focusOverview": "Focus overview",
    "coreHour.focusOverviewDescription": "Daily totals and tag share for the selected period.",
    "coreHour.range": "Range",
    "coreHour.total": "Total",
    "coreHour.activeDays": "Active days",
    "coreHour.dailyAverage": "Daily average",
    "coreHour.minutesPerDay": "Minutes per day",
    "coreHour.minutes": "Minutes",
    "coreHour.tagShare": "Tag share",
    "coreHour.noTaggedCheckIns": "No tagged check-ins in this period.",
    "coreHour.checkIns": "Check-ins",
    "coreHour.uncategorized": "Uncategorized",
    "coreHour.edit": "Edit",
    "coreHour.save": "Save",
    "coreHour.cancel": "Cancel",
    "coreHour.noCheckIns": "No check-ins for this date.",
    "coreHour.newTag": "New tag",
    "coreHour.color": "Color",
    "coreHour.addTag": "Add tag",
    "coreHour.deepWork": "Deep work",
    "coreHour.rename": "Rename",
    "coreHour.archive": "Archive",
    "coreHour.archived": "Archived",
    "coreHour.createTagBefore": "Create a tag before your first check-in.",
    "coreHour.checkInInterval": "Check-in interval",
    "coreHour.intervalApplies": "Applies when you start your next session.",
    "coreHour.saved": "Saved",
    "coreHour.chooseTag": "Choose a tag",
    "coreHour.addNote": "Add a note...",
    "sync.title": "Sync Settings",
    "sync.subtitle": "Configure WebDAV cloud sync for your data",
    "sync.back": "Back to dashboard",
    "sync.configuration": "WebDAV Configuration",
    "sync.serverUrl": "WebDAV Server URL",
    "sync.username": "Username",
    "sync.password": "Password",
    "sync.passwordPlaceholder": "Your WebDAV password",
    "sync.passwordHint": "Your password will be stored securely in the OS keychain, not in the browser.",
    "sync.saveCredentials": "Save Credentials",
    "sync.credentialsSaved": "Credentials saved to keychain",
    "sync.actions": "Sync Actions",
    "sync.export": "Export & Upload",
    "sync.import": "Download & Import",
    "sync.saveFirst": "Save your credentials first before running sync operations.",
    "sync.backups": "Remote Backups",
    "sync.refresh": "Refresh List",
    "sync.noBackups": "No backups found on the server.",
    "sync.refreshHint": "Click Refresh List to fetch remote files.",
    "sync.syncing": "Syncing...",
    "sync.success": "Success",
    "sync.error": "Error",
    "sync.idle": "Idle",
    "sync.lastSynced": "Last synced",
    "sync.never": "Never",
    "sync.importRestart": "Please restart the app to apply changes.",
    "sync.urlRequired": "WebDAV Server URL is required.",
    "sync.usernameRequired": "Username is required.",
    "sync.saveFailed": "Failed to save credentials.",
    "sync.exportFailed": "Export failed.",
    "sync.importFailed": "Import failed.",
    "sync.listFailed": "Failed to list backups.",
    "sync.noRemoteBackups": "No remote backups found.",
  },
  "zh-CN": {
    "app.name": "EfficiencyMemo",
    "app.loading": "正在加载工具...",
    "nav.workspace": "工作区",
    "nav.tools": "工具",
    "nav.settings": "设置",
    "nav.appearance": "外观",
    "nav.lightMode": "浅色模式",
    "nav.darkMode": "深色模式",
    "nav.switchToLight": "切换到浅色模式",
    "nav.switchToDark": "切换到深色模式",
    "nav.backToDashboard": "返回工作台",
    "nav.openMenu": "打开菜单",
    "nav.collapseSidebar": "收起侧栏",
    "nav.expandSidebar": "展开侧栏",
    "nav.language": "语言",
    "nav.switchLanguage": "切换语言",
    "nav.currentEnglish": "English",
    "nav.currentChinese": "简体中文",
    "nav.coreHour": "CoreHour",
    "nav.coreHourDescription": "用轻量检查记录专注时间",
    "dashboard.title": "工作台",
    "dashboard.subtitle": "你的个人工具集",
    "dashboard.open": "打开",
    "dashboard.noTools": "暂时没有可用工具",
    "dashboard.noToolsDescription": "注册工具后会显示在这里。",
    "coreHour.timer": "计时器",
    "coreHour.history": "历史",
    "coreHour.tags": "标签",
    "coreHour.settings": "设置",
    "coreHour.focusSession": "专注会话",
    "coreHour.checkInDue": "需要记录",
    "coreHour.paused": "已暂停",
    "coreHour.running": "进行中",
    "coreHour.ready": "准备开始",
    "coreHour.start": "开始",
    "coreHour.pause": "暂停",
    "coreHour.end": "结束",
    "coreHour.continue": "继续",
    "coreHour.navigation": "CoreHour 导航",
    "coreHour.whatWereYouDoing": "刚才在做什么？",
    "coreHour.recordLast": "记录最近的 {duration}。",
    "coreHour.createTag": "可以在下方创建标签来分类，也可以跳过。",
    "coreHour.note": "备注",
    "coreHour.optional": "可选",
    "coreHour.saveCheckIn": "保存记录",
    "coreHour.skip": "跳过",
    "coreHour.currentSession": "当前会话",
    "coreHour.intervalHint": "每 {minutes} 分钟记录一次，暂停时间不计入。",
    "coreHour.historySubtitle": "{date} 已记录 {minutes} 分钟",
    "coreHour.exportRange": "导出范围",
    "coreHour.last7Days": "最近 7 天",
    "coreHour.last30Days": "最近 30 天",
    "coreHour.allTime": "全部时间",
    "coreHour.exportCsv": "导出 CSV",
    "coreHour.date": "日期",
    "coreHour.focusOverview": "专注概览",
    "coreHour.focusOverviewDescription": "查看所选时间段的每日总计和标签分布。",
    "coreHour.range": "范围",
    "coreHour.total": "总计",
    "coreHour.activeDays": "活跃天数",
    "coreHour.dailyAverage": "日均",
    "coreHour.minutesPerDay": "每日分钟数",
    "coreHour.minutes": "分钟",
    "coreHour.tagShare": "标签分布",
    "coreHour.noTaggedCheckIns": "此时间段没有已标记的记录。",
    "coreHour.checkIns": "记录",
    "coreHour.uncategorized": "未分类",
    "coreHour.edit": "编辑",
    "coreHour.save": "保存",
    "coreHour.cancel": "取消",
    "coreHour.noCheckIns": "当天没有记录。",
    "coreHour.newTag": "新标签",
    "coreHour.color": "颜色",
    "coreHour.addTag": "添加标签",
    "coreHour.deepWork": "深度工作",
    "coreHour.rename": "重命名",
    "coreHour.archive": "归档",
    "coreHour.archived": "已归档",
    "coreHour.createTagBefore": "请在第一次记录前创建标签。",
    "coreHour.checkInInterval": "记录间隔",
    "coreHour.intervalApplies": "下次开始会话时生效。",
    "coreHour.saved": "已保存",
    "coreHour.chooseTag": "选择标签",
    "coreHour.addNote": "添加备注...",
    "sync.title": "同步设置",
    "sync.subtitle": "配置 WebDAV 云同步",
    "sync.back": "返回工作台",
    "sync.configuration": "WebDAV 配置",
    "sync.serverUrl": "WebDAV 服务器地址",
    "sync.username": "用户名",
    "sync.password": "密码",
    "sync.passwordPlaceholder": "输入 WebDAV 密码",
    "sync.passwordHint": "密码会安全地存储在系统钥匙串中，不会保存到浏览器。",
    "sync.saveCredentials": "保存凭据",
    "sync.credentialsSaved": "凭据已保存到钥匙串",
    "sync.actions": "同步操作",
    "sync.export": "导出并上传",
    "sync.import": "下载并导入",
    "sync.saveFirst": "请先保存凭据，再执行同步操作。",
    "sync.backups": "远程备份",
    "sync.refresh": "刷新列表",
    "sync.noBackups": "服务器上没有找到备份。",
    "sync.refreshHint": "点击“刷新列表”获取远程文件。",
    "sync.syncing": "同步中...",
    "sync.success": "成功",
    "sync.error": "错误",
    "sync.idle": "空闲",
    "sync.lastSynced": "上次同步",
    "sync.never": "从未同步",
    "sync.importRestart": "请重启应用以应用更改。",
    "sync.urlRequired": "请输入 WebDAV 服务器地址。",
    "sync.usernameRequired": "请输入用户名。",
    "sync.saveFailed": "保存凭据失败。",
    "sync.exportFailed": "导出失败。",
    "sync.importFailed": "导入失败。",
    "sync.listFailed": "获取备份列表失败。",
    "sync.noRemoteBackups": "没有找到远程备份。",
  },
};

export function translate(locale: Locale, key: string, values?: MessageValues): string {
  const template = messages[locale][key] ?? messages["en-US"][key] ?? key;
  return values ? template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`)) : template;
}

export function currentLocaleLabel(locale: Locale): string {
  return translate(locale, locale === "en-US" ? "nav.currentEnglish" : "nav.currentChinese");
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, values?: MessageValues) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "en-US";
  const stored = window.localStorage.getItem(LOCALE_KEY);
  if (stored === "en-US" || stored === "zh-CN") return stored;
  return window.navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
}

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale ?? detectInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  const value: I18nContextValue = {
    locale,
    setLocale,
    toggleLocale: () => setLocale((current) => current === "en-US" ? "zh-CN" : "en-US"),
    t: (key, values) => translate(locale, key, values),
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
