# Vehicles DB Project

## Contexto
Banco de dados local de veículos brasileiros baseado na tabela FIPE.
Usado como referência de compatibilidade pelo projeto gerador-autopecas.

## API
- FIPE: https://parallelum.com.br/fipe/api/v1
- Tipos: carros e caminhoes (caminhonetes)

## Arquivos
- build-vehicles-db.js → script de build (busca na API FIPE)
- vehicles-lookup.js → módulo de busca no banco local
- vehicles-db.json → banco hierárquico (marca → modelo → anos)
- vehicles-index.json → índice plano para buscas rápidas

## Comandos
- /build-db → gera o banco completo
- /build-db --check → verifica se o banco existe
- /db-search <query> → busca veículos no banco
- /db-update → verifica idade e atualiza se necessário
