# autoroute

A Claude Code mod that sets the **effort** for every prompt by itself and **asks you before it switches the model**.

- Renames, git chores and quick questions get low effort, and you're asked about moving to a lighter model (Sonnet by default).
- Design, debugging, migrations, security and long prompts get high effort, and you're asked about moving to a stronger model (Opus by default).
- Everything in between gets medium effort and keeps whatever model is in use.
- "ok", "yes, do it" and other short replies change nothing, so a follow-up keeps the settings of the task it continues.

The model question is one click: **Switch to Sonnet**, **Stay on Opus** or **Stop asking**. If you say Stay, the same suggestion won't come back for the next 5 prompts. A switch sticks until a prompt calls for a different model, so the model doesn't flip back and forth (every switch starts a fresh prompt cache, which costs extra).

The status line always shows what's in force, for example `autoroute: Sonnet · low (light)`.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install autoroute --marketplace 1kta4/claude-autoroute
```

Answer `y` to add the marketplace, then pick the user scope so it works in every project.

From a shell:

```bash
claude plugin install autoroute --marketplace 1kta4/claude-autoroute
```

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `1kta4/claude-autoroute`, then **Add plugin**.

## Commands

| Command | What it does |
| --- | --- |
| `/autoroute` | Shows the model, effort and last guess |
| `/autoroute off` / `on` | Turns routing off or on |
| `/autoroute reset` | Goes back to the session's own model and effort |
| `/autoroute ask off` / `ask on` | Switches the model without asking, or asks again |

## Settings

Open `/config` and look for the autoroute rows:

| Setting | Default |
| --- | --- |
| Model for light tasks | `sonnet` |
| Model for deep tasks | `opus` |
| Effort for light / everyday / deep tasks | `low` / `medium` / `high` |
| Ask before switching the model | on |

A model can be `haiku`, `sonnet`, `opus`, `fable` or a full model id such as `claude-sonnet-5-5`. Short names map to ids in `hooks/register.ts` (`MODEL_IDS`). Update that map when new models come out.

## How it works

- A `prompt.submit` hook reads each prompt you send and sorts it with keyword rules (`hooks/classify.ts`). It runs locally and costs nothing.
- A `turn.step` hook sends each request of the main conversation with the chosen model and effort.
- Subagents are left alone.
- `/model` still shows the session's own model. The status line shows what autoroute actually sends.

The keyword rules are a starting point. Edit `DEEP` and `LIGHT` in `hooks/classify.ts` to match how you write.

## Requirements

A Claude Code build with function-hook mods. Tested with Claude Code 2.1.308. On older builds, run `claude update`.

## License

MIT
