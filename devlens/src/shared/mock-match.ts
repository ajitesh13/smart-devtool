import type { MockRule } from './types'

const regexCache = new Map<string, RegExp | null>()

function compile(pattern: string): RegExp | null {
  if (regexCache.has(pattern)) return regexCache.get(pattern)!
  let re: RegExp | null = null
  try {
    re = new RegExp(pattern, 'i')
  } catch {
    re = null
  }
  regexCache.set(pattern, re)
  return re
}

/** Does a single rule match this request? Pure. */
export function ruleMatches(rule: MockRule, url: string, method: string): boolean {
  if (!rule.enabled) return false
  if (rule.method && rule.method.toUpperCase() !== method.toUpperCase()) return false
  if (!rule.urlPattern) return false
  if (rule.isRegex) {
    const re = compile(rule.urlPattern)
    return re ? re.test(url) : false
  }
  return url.includes(rule.urlPattern)
}

/** First enabled rule that matches, or null. Pure + testable. */
export function matchRule(rules: MockRule[], url: string, method: string): MockRule | null {
  for (const rule of rules) {
    if (ruleMatches(rule, url, method)) return rule
  }
  return null
}

/** A rule is a pure delay (throttle) if it only adds latency, no override/fail. */
export function isDelayOnly(rule: MockRule): boolean {
  return (
    rule.delayMs != null &&
    rule.delayMs > 0 &&
    rule.status == null &&
    rule.body == null &&
    !rule.failReason
  )
}
