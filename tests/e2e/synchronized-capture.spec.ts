import { expect, test } from '@playwright/test'

test.describe('Phase 06 synchronized capture', () => {
  test.skip(
    process.env.PLAYWRIGHT_PHASE06 !== '1',
    'Development verification requires PLAYWRIGHT_PHASE06=1 and a migrated Supabase project.',
  )

  test('two isolated anonymous sessions capture and reach shared review', async ({
    browser,
  }) => {
    const hostContext = await browser.newContext({
      permissions: ['camera'],
    })
    const partnerContext = await browser.newContext({
      permissions: ['camera'],
    })
    const host = await hostContext.newPage()
    const partner = await partnerContext.newPage()

    await host.goto('/')
    await host.getByRole('button', { name: 'Create a room' }).click()
    await host.getByLabel('Room name').fill('Phase Six')
    await host.getByLabel('Your name').fill('Host')
    await host.getByRole('button', { name: /^Create room/ }).click()
    const code = await host.locator('.bb-code-display strong').innerText()
    await host.getByRole('button', { name: 'Enter waiting room' }).click()

    await partner.goto('/')
    await partner.getByRole('button', { name: 'Join with a code' }).click()
    await partner.getByLabel('Room code').fill(code)
    await partner.getByLabel('Your name').fill('Partner')
    await partner.getByRole('button', { name: /^Join room/ }).click()

    await expect(host.getByText('Both participants are here')).toBeVisible()
    await host.getByRole('button', { name: 'Set up booth' }).click()
    await expect(partner.getByText('Make it yours')).toBeVisible()

    await host.getByRole('button', { name: 'Start session' }).click()
    await expect(host.getByText('Both cameras are ready')).toBeVisible()
    await expect(partner.getByText('Both cameras are ready')).toBeVisible()

    await host
      .getByRole('button', { name: 'Start synchronized capture' })
      .click()
    await expect(host.locator('.bb-countdown strong')).not.toHaveText('')
    await expect(partner.locator('.bb-countdown strong')).not.toHaveText('')

    await expect(host.getByText('Shared review')).toBeVisible({
      timeout: 70_000,
    })
    await expect(partner.getByText('Shared review')).toBeVisible({
      timeout: 70_000,
    })
    await expect(host.getByText('Both captures ready').first()).toBeVisible()
    await expect(partner.getByText('Both captures ready').first()).toBeVisible()

    await hostContext.close()
    await partnerContext.close()
  })
})
