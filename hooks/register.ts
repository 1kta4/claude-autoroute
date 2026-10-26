import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Effort, Route, Tier } from '../types'
import { classify } from './classify'

const route = atom({ plugin: 'autoroute', key: 'route' } as const, {
  model: null,
  effort: null,
  tier: null,
} as Route)

// After "Stay", the same suggestion waits this many prompts before coming back.
const QUIET_PROMPTS = 5

// A model request takes a full id, not an alias, so the short names map here.
const MODEL_IDS: Record<string, string> = {
  haiku: 'claude-haiku-5-5',
  sonnet: 'claude-sonnet-5-5',
  opus: 'claude-opus-5-5',
  fable: 'claude-fable-5-1',
}

const FAMILIES = Object.keys(MODEL_IDS)

const modelId = (name: string) => MODEL_IDS[name.trim().toLowerCase()] ?? name.trim()

const family = (model: string) =>
  FAMILIES.find(name => model.toLowerCase().includes(name)) ?? model

const title = (model: string) => {
  const name = family(model)

  return name.charAt(0).toUpperCase() + name.slice(1)
}

const HELP = [
  '/autoroute           show what is in force',
  '/autoroute on | off  turn routing on or off',
  '/autoroute reset     go back to the session model',
  '/autoroute ask on | off  ask before a model switch, or not',
].join('\n')

async function showStatus($: EngineInterface, isOn: boolean, isMuted: boolean) {
  if (!isOn) {
    $.ui.status('autoroute: off')

    return
  }

  const now = await read($, route)
  const model = now.model ?? (await $.session.model())
  const effort = now.effort ?? 'default'
  const tier = now.tier ? ` (${now.tier})` : ''
  const muted = isMuted ? ', model fixed' : ''
  $.ui.status(`autoroute: ${title(model)} · ${effort}${tier}${muted}`)
}

export const register: Register = (on, options) => {
  const lightModel = modelId(String(options.lightModel ?? 'sonnet'))
  const deepModel = modelId(String(options.deepModel ?? 'opus'))
  const efforts: Record<Tier, Effort> = {
    light: String(options.lightEffort ?? 'low') as Effort,
    standard: String(options.standardEffort ?? 'medium') as Effort,
    deep: String(options.deepEffort ?? 'high') as Effort,
  }

  let isOn = true
  let isAsking = options.askBeforeSwitch !== false
  // "Stop asking": effort still follows each prompt, the model stays put.
  let isMuted = false
  let prompts = 0
  let declined: { model: string; until: number } | null = null

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'autoroute',
      description: 'Show or change automatic model and effort routing',
      argumentHint: 'on | off | reset | ask on | ask off',
    })
    await showStatus($, isOn, isMuted)

    return next(e)
  })

  on('command.run', { command: 'autoroute' }, async ($, e) => {
    const args = e.args.trim().toLowerCase()

    if (args === 'on' || args === 'off') {
      isOn = args === 'on'
      isMuted = false
    } else if (args === 'reset') {
      await update($, route, () => ({ model: null, effort: null, tier: null }))
      isMuted = false
      declined = null
    } else if (args === 'ask on' || args === 'ask off') {
      isAsking = args === 'ask on'
    } else if (args !== '' && args !== 'status') {
      return { text: HELP }
    }

    await showStatus($, isOn, isMuted)
    const now = await read($, route)
    const model = now.model ?? (await $.session.model())

    return {
      text: [
        `Routing is ${isOn ? 'on' : 'off'}; asks before a model switch: ${isAsking ? 'yes' : 'no'}.`,
        `Model: ${model}${now.model ? ' (switched by autoroute)' : ' (session model)'}.`,
        `Effort: ${now.effort ?? 'session default'}${now.tier ? `, last prompt read as ${now.tier}` : ''}.`,
      ].join('\n'),
    }
  })

  on('prompt.submit', async ($, e, next) => {
    // Commands, hidden prompts and prompts typed into a running turn pass as they are.
    if (!isOn || e.command || e.isMeta || e.turnId) {
      return next(e)
    }

    prompts += 1
    const tier = classify(e.text)

    if (tier === null) {
      return next(e)
    }

    const now = await read($, route)
    const sessionModel = await $.session.model()
    const current = now.model ?? sessionModel
    const target = tier === 'light' ? lightModel : tier === 'deep' ? deepModel : null
    let model = now.model

    const isNew = target !== null && family(target) !== family(current)
    const isQuiet =
      declined !== null && declined.model === target && prompts < declined.until

    if (isNew && target !== null && !isQuiet && !isMuted) {
      let isSwitching = !isAsking

      if (isAsking) {
        const yes = `Switch to ${title(target)}`
        const no = `Stay on ${title(current)}`
        const mute = 'Stop asking'
        const answer = await $.ui
          .ask(`This looks like a ${tier} task. Switch to ${title(target)} from now on?`, {
            options: [yes, no, mute],
            header: 'Model',
          })
          .catch(() => no)

        isSwitching = answer === yes

        if (answer === mute) {
          isMuted = true
        } else if (!isSwitching) {
          declined = { model: target, until: prompts + QUIET_PROMPTS }
        }
      }

      if (isSwitching) {
        // Going back to the session's own family drops the override.
        model = family(target) === family(sessionModel) ? null : target
        declined = null
      }
    }

    await update($, route, () => ({ model, effort: efforts[tier], tier }))
    await showStatus($, isOn, isMuted)

    return next(e)
  })

  // Every request of the main loop goes out with the routed model and effort.
  on('turn.step', async function* ($, e, next) {
    if (!isOn || e.agentId !== undefined) {
      return yield* next(e)
    }

    const now = await read($, route)

    return yield* next({
      ...e,
      model: now.model ?? e.model,
      effort: now.effort ?? e.effort,
    })
  })
}
