import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

test('mantém dados offline e sincroniza todos no PostgreSQL', async ({
  page,
  context,
}) => {
  const suffix = randomUUID().slice(0, 8)
  const categoryName = `E2E ${suffix}`
  const personName = `Pessoa E2E ${suffix}`
  const animalName = `Animal E2E ${suffix}`
  const itemName = `Alimento E2E ${suffix}`
  const storageLocation = `Local E2E ${suffix}`
  const expirationDate = new Date(Date.now() + 7 * 86_400_000)
    .toISOString()
    .slice(0, 10)

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible()
  await expect(
    page.getByRole('status', { name: 'Estado dos dados' }),
  ).toContainText('Atualizado')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  await expect(
    page.getByRole('status', { name: 'Estado dos dados' }),
  ).toContainText('Atualizado')
  await context.setOffline(true)

  await page.getByRole('link', { name: 'Categorias' }).click()
  await page.getByRole('button', { name: 'Adicionar categoria' }).click()
  await page.getByLabel('Nome da categoria').fill(categoryName)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText(categoryName, { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Pessoas e animais' }).click()
  await page.getByRole('button', { name: 'Adicionar pessoa ou animal' }).click()
  await page.getByLabel('Nome', { exact: true }).fill(personName)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText(personName, { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Adicionar pessoa ou animal' }).click()
  await page.getByLabel('Nome', { exact: true }).fill(animalName)
  await page.locator('form select').selectOption('ANIMAL')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText(animalName, { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Estoque' }).click()
  await page.getByRole('button', { name: 'Adicionar item' }).click()
  await page.getByLabel('Nome do item').fill(itemName)
  await page
    .locator('form select')
    .first()
    .selectOption({ label: categoryName })
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.getByRole('link', { name: itemName, exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar estoque' }).click()
  await page.getByRole('textbox', { name: 'Quantidade' }).fill('8')
  await page.locator('input[type="date"]').fill(expirationDate)
  await page
    .locator('input[list="storage-location-suggestions"]')
    .fill(storageLocation)
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.locator('.batch-card')).toContainText('Vence em breve')

  await page.reload()
  await page.getByRole('link', { name: 'Pessoas e animais' }).click()
  await expect(page.getByText(personName, { exact: true })).toBeVisible()
  await expect(page.getByText(animalName, { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Visão geral' }).click()
  await expect(page.getByRole('link', { name: itemName }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Alertas' }).click()
  await expect(
    page.getByText('Estoque vence em breve', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: new RegExp(itemName) }).first(),
  ).toBeVisible()

  const pushResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/sync/push') &&
      response.request().method() === 'POST' &&
      response.ok(),
  )
  await context.setOffline(false)
  await pushResponse
  await expect(
    page.getByRole('status', { name: 'Estado dos dados' }),
  ).toContainText('0 aguardando envio')

  execFileSync(
    'uv',
    [
      'run',
      '--directory',
      '../backend',
      'python',
      'scripts/verify_e2e.py',
      categoryName,
      personName,
      animalName,
      itemName,
      storageLocation,
      expirationDate,
    ],
    { cwd: process.cwd(), stdio: 'inherit' },
  )
})
