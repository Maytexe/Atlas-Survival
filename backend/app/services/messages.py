from decimal import Decimal


def alert_message(alert_type: str) -> str:
    return {
        "EXPIRED": "Lote vencido.",
        "OUT_OF_STOCK": "Item sem estoque disponível.",
        "EXPIRING_SOON": "Lote vence em até 30 dias.",
        "LOW_STOCK": "Autonomia abaixo do limite configurado.",
        "NO_CONSUMPTION_DATA": "Sem dados de consumo para estimar autonomia.",
        "BELOW_GOAL": "Estoque abaixo da meta de autonomia.",
    }[alert_type]


def below_goal_message(missing: Decimal, base_unit: str, goal_days: int) -> str:
    return f"Faltam {format(missing, 'f')} {base_unit} para {goal_days} dias."
