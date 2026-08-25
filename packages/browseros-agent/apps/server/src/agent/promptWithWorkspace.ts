// packages/browseros-agent/apps/server/src/agent/promptWithWorkspace.ts
// Custom prompt builder: read ~/.browseros/agent.md, soul.md, skills.md
// and inject them into the BrowserOS Agent System Prompt.

import fs from 'node:fs'
import path from 'node:path'
import { buildSystemPrompt, type BuildSystemPromptOptions } from './prompt'

function safeRead(filePath: string | undefined): string | undefined {
  if (!filePath) return undefined
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim()
    return content.length > 0 ? content : undefined
  } catch {
    return undefined
  }
}

/**
 * Load global manifests from ~/.browseros:
 * - agent.md  -> high-level philosophy / rules
 * - soul.md   -> personality / style
 * - skills.md -> skills / allowed actions
 */
function loadGlobalManifests(): {
  agent?: string
  soul?: string
  skills?: string
} {
  const home = process.env.HOME || process.env.USERPROFILE
  if (!home) return {}

  const root = path.join(home, '.browseros')

  const agent = safeRead(path.join(root, 'agent.md'))
  const soul = safeRead(path.join(root, 'soul.md'))
  const skills = safeRead(path.join(root, 'skills.md'))

  return { agent, soul, skills }
}

/**
 * Build the system prompt, injecting global ~/.browseros manifests
 * into userSystemPrompt / soulContent and appending an <agent_skills> section.
 */
export function buildSystemPromptWithWorkspace(
  options: BuildSystemPromptOptions = {},
): string {
  const globalManifests = loadGlobalManifests()

  const mergedAgent = [globalManifests.agent, options.userSystemPrompt]
    .filter(Boolean)
    .join('\n\n')
  const mergedSoul = [globalManifests.soul, options.soulContent]
    .filter(Boolean)
    .join('\n\n')

  // skills: currently only from ~/.browseros/skills.md
  const skillsText = globalManifests.skills

  const basePrompt = buildSystemPrompt({
    ...options,
    userSystemPrompt: mergedAgent || options.userSystemPrompt,
    soulContent: mergedSoul || options.soulContent,
  })

  const skillsSection = skillsText
    ? `\n\n<agent_skills>\n${skillsText}\n</agent_skills>`
    : ''

  return basePrompt + skillsSection
}
