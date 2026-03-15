Verifique a idade do banco de veículos e atualize se necessário.

1. Rode `node build-vehicles-db.js --check` para ver a idade do banco
2. Se o banco tem mais de 30 dias, pergunte ao usuário se deseja atualizar
3. Se confirmado, rode `node build-vehicles-db.js` para rebuild completo
4. Se o banco não existe, informe e sugira rodar /build-db
