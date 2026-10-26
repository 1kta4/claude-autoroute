import { describe, expect, test } from 'claude-code/testing'

import { classify } from './classify'

describe('classify', () => {
  test('chores read as light', () => {
    expect(classify('rename getUser to fetchUser')).toBe('light')
    expect(classify('commit and push this')).toBe('light')
    expect(classify('fix the typo in the header')).toBe('light')
  })

  test('hard work reads as deep', () => {
    expect(classify('debug why the RLS policy blocks inserts')).toBe('deep')
    expect(classify('plan the schema migration for invoices')).toBe('deep')
  })

  test('everything else reads as standard', () => {
    expect(classify('add a total row to the invoice table')).toBe('standard')
  })

  test('a bare yes changes nothing', () => {
    expect(classify('ok')).toBe(null)
    expect(classify('yes, do it')).toBe(null)
  })
})

const opus = 'claude-opus-5-5'

const step = {
  turnId: 't1',
  index: 0,
  model: opus,
  effort: 'xhigh',
  messageCount: 1,
} as const

const prompt = (text: string) =>
  ({ text, wait: false, origin: { kind: 'composer' } }) as const

test('without asking, a light prompt goes to the light model at low effort', { options: { askBeforeSwitch: false } }, async ($, on) => {
  const sent: { model: string; effort?: unknown }[] = []
  on('session.model', () => ({ value: opus }))
  on('ui.status', () => ({ value: undefined }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.step', async function* (_, e) {
    sent.push({ model: e.model, effort: e.effort })

    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })

  await $.prompt.submit(prompt('rename getUser to fetchUser'))
  for await (const _ of $.turn.step(step)) {
    // drain
  }

  expect(sent[0]?.model).toBe('claude-sonnet-5-5')
  expect(sent[0]?.effort).toBe('low')
})

test('when the question gets no answer, the model stays and effort still moves', async ($, on) => {
  const sent: { model: string; effort?: unknown }[] = []
  on('session.model', () => ({ value: opus }))
  on('ui.status', () => ({ value: undefined }))
  on('prompt.submit', (_, e) => ({ text: e.text }))
  on('turn.step', async function* (_, e) {
    sent.push({ model: e.model, effort: e.effort })

    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })

  await $.prompt.submit(prompt('rename getUser to fetchUser'))
  for await (const _ of $.turn.step(step)) {
    // drain
  }

  expect(sent[0]?.model).toBe(opus)
  expect(sent[0]?.effort).toBe('low')
})
