# 003 - Ordem global de change_seq

- Sequências PostgreSQL não seguem a ordem de commit e podem causar saltos no pull.
- Toda transação de escrita adquire o mesmo advisory lock transacional antes de escrever.
- A sequence global é atribuída pelo trigger BEFORE INSERT OR UPDATE.
- O lock é mantido até commit/rollback, serializando a atribuição com a ordem de commit.
- REST e sync compartilham `write_transaction` como único helper de escrita.
