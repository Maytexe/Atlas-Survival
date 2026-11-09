import { useState } from 'react'
import { Droplet } from 'lucide-react'
import { DashboardDetails } from '@/components/DashboardDetails'
import { FirstUseChecklist } from '@/components/FirstUseChecklist'
import { GoalBand } from '@/components/GoalBand'
import { GoalEditor } from '@/components/GoalEditor'
import { PageHeading } from '@/components/PageHeading'
import { StatusPanel } from '@/components/StatusPanel'
import { calculateAlerts, calculateDashboard } from '@/domain'
import { toItemSnapshots } from '@/domain/from-records'
import { useGoals } from '@/hooks/use-goals'
import { useLocalData } from '@/hooks/use-local-data'
import { useSettings } from '@/hooks/use-settings'
import { messages } from '@/i18n/pt-BR'
import { getToday } from '@/services/clock'
import { formatPlural } from '@/services/format'
import { createCategory } from '@/services/repositories'

export function DashboardPage() {
  const { data, error, loading } = useLocalData()
  const { settings } = useSettings()
  const { goalFoodDays, goalWaterDays, saveGoals } = useGoals()
  const [editingGoal, setEditingGoal] = useState<'FOOD' | 'WATER' | null>(null)
  const [creatingCategories, setCreatingCategories] = useState(false)
  const [categoryError, setCategoryError] = useState('')
  const today = getToday(new Date(), settings?.timeZone)
  const snapshots = data
    ? toItemSnapshots(data.items, data.batches, data.members)
    : []
  const dashboard = calculateDashboard(
    snapshots,
    today,
    goalFoodDays,
    goalWaterDays,
  )
  const peopleCount =
    data?.members.filter((member) => member.member_type === 'PERSON').length ??
    0
  const animalCount =
    data?.members.filter((member) => member.member_type === 'ANIMAL').length ??
    0
  const heroGroups = new Map<
    string,
    {
      kind: 'FOOD' | 'WATER'
      autonomy?: (typeof dashboard.autonomy)[number]
      goal?: (typeof dashboard.goals)[number]
    }
  >()
  for (const autonomy of dashboard.autonomy) {
    const unit =
      autonomy.base_unit ??
      (autonomy.dimension === 'MASS'
        ? 'g'
        : autonomy.dimension === 'VOLUME'
          ? 'ml'
          : '')
    heroGroups.set(`${autonomy.item_kind}:${autonomy.dimension}:${unit}`, {
      kind: autonomy.item_kind,
      autonomy,
    })
  }
  for (const goal of dashboard.goals) {
    const key = `${goal.item_kind}:${goal.dimension}:${goal.base_unit}`
    heroGroups.set(key, {
      ...heroGroups.get(key),
      kind: goal.item_kind,
      goal,
    })
  }
  for (const kind of ['WATER', 'FOOD'] as const) {
    if (![...heroGroups.values()].some((group) => group.kind === kind)) {
      heroGroups.set(`${kind}:empty`, { kind })
    }
  }
  const alerts = data
    ? calculateAlerts(
        snapshots,
        today,
        settings?.lowStockDays ?? 7,
        goalFoodDays,
        goalWaterDays,
      ).filter((alert) => alert.severity !== 'INFO')
    : []

  const createSuggestedCategories = async () => {
    if (!data) return
    setCreatingCategories(true)
    setCategoryError('')
    try {
      const existing = new Set(
        data.categories.map((category) =>
          category.name.toLocaleLowerCase('pt-BR'),
        ),
      )
      for (const name of messages.suggestedCategories) {
        if (existing.has(name.toLocaleLowerCase('pt-BR'))) continue
        await createCategory({ name, description: null })
      }
    } catch (cause) {
      setCategoryError(
        cause instanceof Error
          ? cause.message
          : messages.categorySuggestionError,
      )
    } finally {
      setCreatingCategories(false)
    }
  }

  const saveGoal = async (value: number | null) => {
    if (!settings || !editingGoal) throw new Error(messages.settingsError)
    await saveGoals(
      editingGoal === 'FOOD' ? value : goalFoodDays,
      editingGoal === 'WATER' ? value : goalWaterDays,
      settings,
    )
  }

  const householdMembers = [
    peopleCount > 0
      ? formatPlural(peopleCount, messages.housePerson, messages.housePeople)
      : '',
    animalCount > 0
      ? formatPlural(animalCount, messages.houseAnimal, messages.houseAnimals)
      : '',
  ].filter(Boolean)

  return (
    <>
      <PageHeading
        title={messages.dashboardTitle}
        description={messages.dashboardIntro}
      />
      <StatusPanel loading={loading} error={error}>
        {data && (
          <div className="dashboard-content">
            <p className="dashboard-greeting">
              <Droplet size={20} aria-hidden="true" />
              {householdMembers.length
                ? messages.householdPrefix + householdMembers.join(' e ')
                : messages.dashboardNoHousehold}
            </p>
            <section className="autonomy-hero" aria-label={messages.autonomy}>
              {Array.from(heroGroups.entries()).map(([key, group]) => (
                <GoalBand
                  key={key}
                  kind={group.kind}
                  {...(group.goal ? { goal: group.goal } : {})}
                  {...(group.autonomy ? { autonomy: group.autonomy } : {})}
                  inventory={data.items}
                  onEdit={() => setEditingGoal(group.kind)}
                />
              ))}
            </section>
            <FirstUseChecklist
              hasMembers={data.members.length > 0}
              hasCategories={data.categories.length > 0}
              hasItems={data.items.length > 0}
              hasConsumption={data.items.some(
                (item) => item.daily_consumption !== null,
              )}
              hasGoal={goalFoodDays !== null || goalWaterDays !== null}
              creatingCategories={creatingCategories}
              error={categoryError}
              onCreateCategories={() => void createSuggestedCategories()}
            />
            <section
              className="summary-grid"
              aria-label={messages.dashboardTitle}
            >
              <article className="summary-card">
                <span>{messages.totalItems}</span>
                <strong>
                  {data.items.length
                    ? formatPlural(
                        data.items.length,
                        messages.itemCountSingular.replace('1 ', ''),
                        messages.itemCountPlural.replace('{count} ', ''),
                      )
                    : messages.emptyData}
                </strong>
              </article>
              <article className="summary-card">
                <span>{messages.peopleCount}</span>
                <strong>
                  {peopleCount
                    ? formatPlural(
                        peopleCount,
                        messages.person.toLowerCase(),
                        messages.peoplePlural,
                      )
                    : messages.emptyData}
                </strong>
              </article>
              <article className="summary-card">
                <span>{messages.animalCount}</span>
                <strong>
                  {animalCount
                    ? formatPlural(
                        animalCount,
                        messages.animal.toLowerCase(),
                        messages.animalsPlural,
                      )
                    : messages.emptyData}
                </strong>
              </article>
              <article className="summary-card summary-card-warning">
                <span>{messages.expiredBatches}</span>
                <strong>
                  {data.items.length
                    ? String(dashboard.expired_batches)
                    : messages.emptyData}
                </strong>
              </article>
              <article className="summary-card summary-card-warning">
                <span>{messages.expiringBatches}</span>
                <strong>
                  {data.items.length
                    ? String(dashboard.expiring_soon_batches)
                    : messages.emptyData}
                </strong>
              </article>
            </section>
            <DashboardDetails
              data={data}
              dashboard={dashboard}
              alerts={alerts}
              today={today}
              timeZone={settings?.timeZone ?? 'America/Sao_Paulo'}
            />
          </div>
        )}
      </StatusPanel>
      {editingGoal && settings && (
        <GoalEditor
          kind={editingGoal}
          current={editingGoal === 'FOOD' ? goalFoodDays : goalWaterDays}
          onClose={() => setEditingGoal(null)}
          onSave={saveGoal}
        />
      )}
    </>
  )
}
