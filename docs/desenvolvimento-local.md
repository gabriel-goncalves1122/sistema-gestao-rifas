# Ambiente Local

## Preparacao

Instale as dependencias diretamente a partir da raiz (o comando executa a instalacao em ambos os pacotes automaticamente):

```bash
npm install
```

Ou, se preferir instalar manualmente em cada pacote:

```bash
npm --prefix frontend install
npm --prefix backend/functions install
```

No Linux, execute uma vez o ajuste de `inotify`:

```bash
npm run setup:linux
```

O comando pede `sudo` para criar
`/etc/sysctl.d/99-sistema-rifas-inotify.conf`. Ele aumenta a capacidade de
watchers usada em conjunto por VS Code, Vite, TypeScript e Firebase.

Os comandos padrao usam polling e funcionam mesmo antes desse ajuste. Depois
de aplica-lo, `npm --prefix frontend run dev:inotify` oferece menor uso de CPU.

## Desenvolvimento Em Dois Terminais

Na raiz do repositorio:

```bash
# Terminal 1: backend e emuladores com backend/banco-local
npm run dev:backend:local

# Terminal 2: Vite
npm run dev:vite
```

`dev:backend:local` compila as Functions, inicia o watch de TypeScript e sobe
Auth, Functions, Firestore e Storage. O Firestore importa
`backend/banco-local` na inicializacao e exporta o estado atualizado para o
mesmo diretorio apos um encerramento normal com `Ctrl+C`.

Os aliases antigos `dev:emulators` e `dev:frontend` permanecem disponiveis e
executam exatamente os mesmos fluxos.

Para acessar o frontend por outro dispositivo da rede local:

```bash
npm run dev:vite:network
```

Encerre cada terminal com `Ctrl+C`. O coordenador local isola os grupos de
processo, encaminha um unico sinal ao Firebase, aguarda a exportacao para
`backend/banco-local` e somente depois encerra o TypeScript. Um segundo
`Ctrl+C` forca a saida e deve ser reservado para processos travados.

## Configuracao Canonica

O `firebase.json` da raiz e a unica fonte de verdade para Hosting, Functions,
Firestore, Storage, rules, indexes e emuladores. Nao execute o Firebase com um
arquivo de configuracao dentro de `backend/`.

Portas locais:

| Servico | Porta |
| --- | ---: |
| Emulator UI | 4000 |
| Functions | 5001 |
| Firestore | 8080 |
| Auth | 9099 |
| Storage | 9199 |

O Hub (`4400`), Logging (`4500`) e o WebSocket do Firestore (`9150`) tambem
sao verificados antes da inicializacao.

## Diagnostico

Antes de iniciar, o script falha com uma lista objetiva se alguma porta estiver
ocupada. Para identificar o processo:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
```

Prefira encerrar pelo terminal original. Se o Firebase tiver caido e deixado um
processo orfao, confira o comando e o PID antes de usar `kill <pid>`; nao use
`fuser -k` indiscriminadamente.

O alias explicito do modo polling permanece disponivel para diagnostico:

```bash
npm --prefix frontend run dev:poll
```

## Build E Testes

```bash
npm run build
npm test
```

Os testes de Firestore Rules iniciam um emulador efemero automaticamente. Nao
deixe o ambiente de desenvolvimento ocupando a porta `8080` durante `npm test`.

O build das Functions limpa `lib` e compila somente `src`, gerando
`lib/index.js`. Testes nao podem ser emitidos em `lib`, pois o Firebase observa
essa pasta para hot reload.

## Dependencias

Use `npm audit` separadamente em `frontend` e `backend/functions`. Nao execute
`npm audit fix --force` sem revisar as atualizacoes maiores e rodar toda a
bateria de testes.
