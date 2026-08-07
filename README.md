# Seja Livre AI Platform

Plataforma SaaS premium para gestão inteligente de salões de beleza, integrando WhatsApp, BEMP e IA Julia.

## 🚀 Arquitetura Consolidada

O sistema utiliza serviços centralizados para garantir integridade e facilitar a manutenção:

- **BempService**: Fachada única para toda a API BEMP.
- **EvolutionService**: Fachada única para integração com WhatsApp.
- **AIService**: Orquestração centralizada de modelos LLM e Multimodais.

## 🛡️ Políticas de Segurança e Negócio

### Identificação de Assinantes (Plano Beauty)
A identificação de assinantes é realizada **exclusivamente via telefone cadastrado**.
- O uso de CPF foi totalmente removido dos fluxos de WhatsApp e assinatura.
- O sistema intercepta menções a documentos e orienta o uso do telefone com DDD.

### Promoções Determinísticas
Promoções críticas como o **Pacote de Mechas (R$ 289,90)** são injetadas via código antes do processamento da IA, garantindo que ofertas obrigatórias nunca sejam omitidas.

### Follow-up Inteligente
Motor de CRM que monitora abandonos e executa lembretes automáticos com detecção de pausa humana para evitar interrupções indevidas.

## 🛠️ Desenvolvimento

### Testes de Regressão
Execute a suíte de regressão após qualquer alteração estrutural:
```bash
bun run src/lib/regression-tests.server.ts
```

---
*Fase 4 da Auditoria Técnica Concluída.*
