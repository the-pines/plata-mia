'use client'

interface Tab {
  key: string
  label: string
  count?: number
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onChange: (key: string) => void
}

export function TabBar({ tabs, activeTab, onChange }: TabBarProps) {
  return (
    <div className="flex bg-surface border border-border rounded-sm p-1">
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-xs uppercase tracking-wider font-medium rounded-sm transition-all duration-150 ${
              isActive
                ? 'bg-phosphor-muted text-phosphor text-glow border border-phosphor/20'
                : 'text-tertiary hover:text-secondary border border-transparent'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-medium rounded-sm ${
                  isActive
                    ? 'bg-phosphor text-surface-page'
                    : 'bg-border text-tertiary'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
