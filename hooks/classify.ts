import type { Tier } from '../types'

// Work that rewards a stronger model and more thinking.
const DEEP = [
  /\barchitect/i,
  /\bdesign\b/i,
  /\brefactor/i,
  /\bmigrat/i,
  /\bsecurity\b/i,
  /\bRLS\b/,
  /\bpolic(y|ies)\b/i,
  /\bdebug/i,
  /\bwhy (does|is|do|did|are|would)\b/i,
  /\brace condition/i,
  /\bdeadlock/i,
  /\bconcurren/i,
  /\bperformance\b/i,
  /\boptimi[sz]/i,
  /\bplan\b/i,
  /\breview\b/i,
  /\binvestigat/i,
  /\bschema\b/i,
  /\bauth(entication|orization)?\b/i,
  /\bstack ?trace\b/i,
  /\bTraceback\b/,
  /\bException\b/,
  /\bfrom scratch\b/i,
  /\btrade-?offs?\b/i,
  /\barhitektur/i,
  /\bmigracij/i,
  /\bsigurnost/i,
  /\bzašto\b/i,
]

// Chores a lighter model does just as well.
const LIGHT = [
  /\brename\b/i,
  /\btypos?\b/i,
  /\bcommit\b/i,
  /\bpush\b/i,
  /\bpull\b/i,
  /\bformat\b/i,
  /\blint\b/i,
  /\bwhat (is|does|are)\b/i,
  /\bshow me\b/i,
  /\bwhere is\b/i,
  /\btranslate/i,
  /\bspelling\b/i,
  /\bbump\b/i,
  /\bgit status\b/i,
  /\bupdate (the )?(readme|version|docs?|changelog)\b/i,
  /\brun (the )?(tests?|build|app|server)\b/i,
  /\bpreimenuj/i,
]

// "ok", "yes, do it": carries on whatever came before, so nothing changes.
const CARRY_ON =
  /^(ok(ay)?|yes|yeah|yep|sure|go( ahead)?|do it|continue|keep going|thanks?|thank you|ty|y|no|nope|k)\b[\s.,!]*(do it|go ahead|please|thanks?)?[\s.!]*$/i

const count = (patterns: RegExp[], text: string) =>
  patterns.filter(pattern => pattern.test(text)).length

// null means the prompt says too little to move anything.
export const classify = (text: string): Tier | null => {
  const trimmed = text.trim()

  if (trimmed.length < 4 || CARRY_ON.test(trimmed)) {
    return null
  }

  const deep = count(DEEP, trimmed)
  const light = count(LIGHT, trimmed)

  if (deep >= 2 || (deep >= 1 && trimmed.length > 200) || trimmed.length > 1200) {
    return 'deep'
  }

  if (deep === 0 && light >= 1 && trimmed.length < 300) {
    return 'light'
  }

  return 'standard'
}
