import { type FC, useMemo } from 'react'
import { useNetworkStore } from '../../store/network.store'
import { useViewStore, paneProtocolFilter, paneQueryConfig, type Pane } from '../../store/view.store'
import { runQuery } from '../../lib/query-engine'
import { PaneToolbar } from './PaneToolbar'
import { GroupedTable } from './GroupedTable'

interface Props {
  pane: Pane
}

export const NetworkPane: FC<Props> = ({ pane }) => {
  const requests = useNetworkStore((s) => s.requests)
  const updatePane = useViewStore((s) => s.updatePane)

  const groups = useMemo(() => {
    const scoped = paneProtocolFilter(pane, requests)
    return runQuery(scoped, paneQueryConfig(pane))
  }, [requests, pane])

  const count = useMemo(() => groups.reduce((s, g) => s + g.requests.length, 0), [groups])

  return (
    <div className="flex flex-col h-full min-w-0 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
      <PaneToolbar pane={pane} count={count} onUpdate={(u) => updatePane(pane.id, u)} />
      <GroupedTable groups={groups} ungrouped={pane.group.by === 'none'} />
    </div>
  )
}
