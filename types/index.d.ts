export type Tier = 'light' | 'standard' | 'deep'

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export type Route = {
  // The model every main-loop request goes to; null keeps the session's own.
  model: string | null
  effort: Effort | null
  tier: Tier | null
}

declare module 'claude-code' {
  interface PluginState {
    autoroute: { route: Route }
  }
}
