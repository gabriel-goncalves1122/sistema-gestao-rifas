# Armazenamento de Arquivos (Cloud Storage)

Embora a maioria dos dados transacionais viva no Firestore, o Firebase Cloud Storage é utilizado para hospedar os arquivos binários do sistema.

## 1. Estrutura de Diretórios (Buckets)

O bucket padrão do Firebase Storage segue a seguinte arquitetura de pastas:

### [DEPRECATED] `/comprovantes` e `/comprovantes_atrasados`
- **Atenção (Dívida Técnica)**: O envio manual de comprovantes é uma feature obsoleta. Atualmente o sistema utiliza webhooks automatizados e este fluxo já não aparece no Frontend. Esta estrutura de pastas foi preservada apenas por questões de *legacy code* e **será removida do backend futuramente**.
- **Propósito Anterior**: Armazenar as imagens (JPEG, PNG) ou PDFs enviados manualmente pelos compradores como fallback de comprovação de transferência bancária. A URL era gravada no documento `bilhetes` sob a chave `comprovante_url`.

### `/documentos_secretaria`
- **Propósito**: Hospedar arquivos restritos e institucionais geridos pela comissão (Atas, Planilhas, Contratos).
- **Estrutura Interna**: Subdividido dinamicamente por `Area` e `Tipo`. Ex: `/documentos_secretaria/Tesouraria/relatorio/arquivo_xyz.pdf`.
- **Relacionamento**: Apontado pela coleção `documentos_secretaria` no Firestore através da chave `storagePath`.

## 2. Regras de Acesso e Segurança (Storage Rules)

O acesso aos arquivos é fortemente blindado pelas regras do Storage (`storage.rules`):
- O upload de arquivos para a pasta `/documentos_secretaria` é estritamente limitado a usuários autenticados cujos cargos (verificados via Custom Claims ou Firestore) possuam privilégios de diretoria/secretaria.
- Comprovantes legados possuem regras mais flexíveis para gravação durante o fluxo de checkout, mas restrições de leitura para evitar vazamento de dados bancários de terceiros, limitando a visualização apenas ao vendedor atrelado ou à equipe da tesouraria.
