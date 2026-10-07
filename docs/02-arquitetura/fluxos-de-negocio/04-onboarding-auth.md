# Fluxo 03: Onboarding de Aderidos e Custom Claims

A segurança e os níveis de permissão do sistema não utilizam coleções avulsas para controlar papéis de sistema. Usamos **Firebase Custom Claims**. Para que um membro da comissão tenha acesso, ele deve ser primeiro "adicionado" pela Secretaria, o que gera o perfil dele.

```mermaid
sequenceDiagram
    autonumber
    actor NovoUser as Estudante Aderido
    actor Admin as Secretaria (Admin)
    participant SPA as React App
    participant API as API Express (Auth & Secretaria)
    participant Auth as Firebase Auth
    participant DB as Firestore (Coleção 'usuarios')

    note over Admin, API: Passo A: Criação Prévia do Perfil
    Admin->>API: POST /api/admin/secretaria/aderidos (cpf, email)
    API->>DB: Cria documento em 'usuarios' { email, status: 'pendente' }

    note over NovoUser, DB: Passo B: O Primeiro Login
    NovoUser->>SPA: Clica em "Login com Google"
    SPA->>Auth: Dispara Provider OAuth2 (Google)
    Auth-->>SPA: Retorna Credencial (Token Provisório de Identidade)

    SPA->>API: POST /api/auth/elegibilidade { email }
    API->>DB: Busca se o email existe na coleção 'usuarios'
    DB-->>API: Encontrou! (Retorna True)
    API-->>SPA: 200 OK (Usuário elegível)

    SPA->>API: POST /api/auth/completar-registo { token JWT Google }
    activate API
    API->>Auth: Pede decodificação do Token para garantir autenticidade
    Auth-->>API: UID gerado pelo Auth

    API->>DB: Atualiza 'usuarios' (Injeta o UID no documento)
    API->>DB: Atualiza status para 'ativo'
    
    API->>Auth: setCustomUserClaims(UID, { role: 'aderido' })
    API-->>SPA: 200 OK (Registo Completo)
    deactivate API

    SPA->>Auth: currentUser.getIdToken(true) (Força Refresh)
    Auth-->>SPA: Novo Token com as Claims Embutidas
    SPA-->>NovoUser: Renderiza a Tela do Painel Vendedor
```
