# Agendamento Mensal — Windows Task Scheduler

Configura o script `update-monthly.js` para rodar automaticamente todo dia 1 do mês.

## Opção 1: Via interface gráfica

1. Abrir **Agendador de Tarefas** (Win+R → `taskschd.msc`)
2. Painel direito → **Criar Tarefa Básica**
3. Configurar:

| Campo | Valor |
|-------|-------|
| Nome | `FIPE - Atualização Mensal` |
| Descrição | `Atualiza banco de veículos FIPE se tiver mais de 30 dias` |
| Disparador | Mensal, dia **1**, qualquer mês, horário **08:00** |
| Ação | Iniciar um programa |
| Programa | `node` |
| Argumentos | `update-monthly.js` |
| Iniciar em | `C:\Users\USER\vehicles-db-project` |

4. Marcar: **"Executar estando o usuário conectado ou não"**
5. Marcar: **"Executar com privilégios mais altos"** (opcional)
6. Aba Configurações → marcar **"Se a tarefa falhar, reiniciar a cada 1 hora"** (máx 3 tentativas)

## Opção 2: Via PowerShell (uma linha)

Abrir PowerShell como **Administrador** e colar:

```powershell
$action = New-ScheduledTaskAction -Execute "node" -Argument "update-monthly.js" -WorkingDirectory "C:\Users\USER\vehicles-db-project"
$trigger = New-ScheduledTaskTrigger -Monthly -DaysOfMonth 1 -At 8am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Hours 1)
Register-ScheduledTask -TaskName "FIPE - Atualizacao Mensal" -Action $action -Trigger $trigger -Settings $settings -Description "Atualiza banco FIPE se > 30 dias"
```

> **StartWhenAvailable** = se o PC estiver desligado no dia 1, roda assim que ligar.

## Opção 3: Manual

```bash
cd C:\Users\USER\vehicles-db-project
npm run update
```

## Log

O script grava log em `update-monthly.log` no mesmo diretório. Para verificar:

```bash
cat update-monthly.log
```

## Testar sem atualizar

O script só faz rebuild se o banco tiver mais de 30 dias. Para testar:

```bash
node update-monthly.js
# Saída esperada: "✅ Banco atualizado (≤ 30 dias). Nada a fazer."
```

Para forçar rebuild independente da idade:

```bash
npm run build
```
