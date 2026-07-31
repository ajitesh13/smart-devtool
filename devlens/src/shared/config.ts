import type { Config } from './types'

export const getConfig = async (): Promise<Config> => {
  const stored = await chrome.storage.local.get([
    'anthropicApiKey',
    'claudeCodePort',
    'claudeCodeAutoConnect',
    'licenseKey',
    'tier',
    'excludePatterns',
    'heuristicConsoleLinks',
    'mockRules',
  ])
  return stored as Config
}

export const setConfig = async (updates: Partial<Config>): Promise<void> => {
  await chrome.storage.local.set(updates)
}

export const DEFAULT_CLAUDE_CODE_PORT = 3000
