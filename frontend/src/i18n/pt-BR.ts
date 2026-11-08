export const messages = {
  appName: 'ATLAS',
  tagline: 'Preparação que cabe na rotina.',
  foundationStatus: 'A fundação do aplicativo está pronta.',
  categoryHasActiveItems:
    'Não é possível excluir uma categoria que possui itens ativos.',
  duplicateCategory: 'Já existe uma categoria ativa com esse nome.',
  categoryRequired: 'O item precisa de uma categoria ativa.',
  inventoryItemRequired: 'O lote precisa de um item ativo.',
  batchAdjustmentNegative: 'O ajuste não pode deixar a quantidade negativa.',
  quantityCannotBeNegative: 'A quantidade não pode ser negativa.',
  consumptionCannotBeNegative: 'O consumo diário não pode ser negativo.',
  invalidDecimal:
    'Informe um valor decimal válido com até três casas decimais.',
  recordNotFound: 'O registro não foi encontrado.',
  syncError: 'Não foi possível concluir a sincronização.',
  staleMutation:
    'Uma alteração local ficou desatualizada e foi substituída pelos dados do servidor.',
  mutationNotDiscardable: 'A mutação não está rejeitada ou bloqueada.',
  missingOutboxSequence: 'A mutação não possui sequência local.',
  invalidSyncResponse: 'A resposta do servidor de sincronização é inválida.',
  mismatchedSyncResponse:
    'A resposta de sincronização não corresponde à ordem enviada.',
  syncLockTimeout: 'Não foi possível obter o bloqueio da sincronização.',
  offlineTitle: 'Sem conexão',
  communicationErrorTitle: 'Erro de comunicação',
} as const
