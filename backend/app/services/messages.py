def alert_message(alert_type: str) -> str:
    return {
        "EXPIRED": "Lote vencido.",
        "OUT_OF_STOCK": "Item sem estoque disponível.",
        "EXPIRING_SOON": "Lote vence em até 30 dias.",
        "LOW_STOCK": "Autonomia abaixo do limite configurado.",
        "NO_CONSUMPTION_DATA": "Sem dados de consumo para estimar autonomia.",
    }[alert_type]
