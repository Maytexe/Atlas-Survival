# 002 - Correção absoluta de quantidade

- ADJUST representa consumo como delta comutativo e não altera `client_updated_at`.
- UPDATE representa correção manual absoluta e continua sujeito a LWW.
- Uma correção pode sobrescrever ajustes concorrentes de outro dispositivo.
- A limitação foi adicionada à especificação e será informada no README.
- Não há resolução automática adicional nesta etapa.
