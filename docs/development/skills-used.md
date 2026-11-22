# Master Skills Ledger — FedSocial V2

**Document**: `docs/development/skills-used.md`  
**Standard**: Verification & Transparency Protocol under Section 5.3 of Master Specification  

This ledger records all local agent skills actively consulted, read from `C:\Users\FATHIR\.agents\skills\<skill>\SKILL.md`, and applied to the design, architecture, implementation, and verification of FedSocial V2.

---

## 1. Skills Usage Registry

| Skill | Read Successfully | Applied To | Evidence / Implementation Output |
| :--- | :---: | :--- | :--- |
| `architecture` | Yes | System boundary definition, monorepo decomposition, trade-off analysis | Defined `apps/web`, `apps/api`, `ml/`, and `clients/local-agent` boundaries; documented in `docs/migration/legacy-audit.md` and ADRs. |
| `architecture-decision-records` | Yes | Technical choices & architectural decision records (MADR format) | Formatted ADR templates and decision lifecycle (`docs/architecture/`). |
| `product-design` | Yes | Editorial publication UX, cognitive load reduction, design tokens | Defined editorial typography pairings, high-contrast readability, and non-generic layout principles. |
| `product-manager` | Yes | Product definition, user personas (AI, Sports, History), functional scope | Structured Phase 0 PRD specifications, RICE prioritization, and feature matrix. |
| `privacy-by-design` | Yes | GDPR Art. 25 Data Minimization, local-first IndexedDB/SQLite architecture | Guaranteed 0-byte raw user browsing history transmission to central PostgreSQL. |
| `backend-architect` | Pending Phase 1 | Express + TypeScript API structure, routing, middleware, error handling | `apps/api/src/` architecture and controller-service-repository patterns. |
| `database-design` | Pending Phase 1 | PostgreSQL relational schema, indexes, constraints, and entity relationships | `apps/api/prisma/schema.prisma` public content model. |
| `prisma-expert` | Pending Phase 1 | Prisma client configuration, schema validation, migration history | Database migrations and typed Prisma queries. |
| `react-nextjs-development` | Pending Phase 2 | Next.js App Router, React Server Components vs Client Components | `apps/web/app/` structure, responsive layout, hydration safety. |
| `frontend-architecture` | Pending Phase 2 | Component hierarchy, state management, client-side event bus | Modular UI component design in `apps/web/components/`. |
| `design-taste-frontend` | Pending Phase 2 | Anti-AI-slop visual styling, calibrated palette, strict layout rules | Rejection of purple-blue neon gradients and glassmorphism clichés. |
| `ui-ux-pro-max` | Pending Phase 2 | Accessibility (WCAG 2.1), touch targets, typography hierarchy | Editorial reading interface styling, contrast ratios > 4.5:1. |
| `ai-ml` | Pending Phase 5-8 | PyTorch model pipelines, neural recommendation architectures | `ml/src/models/` neural recommender and training loops. |
| `ml-experiment` | Pending Phase 6-8 | Reproducible seeds, experiment configurations, logging | `ml/experiments/configs/` YAML definitions and JSON result schemas. |
| `ml-pipeline-workflow` | Pending Phase 5-8 | Data split protocols, candidate negative sampling, feature pipelines | Chronological temporal splitting and 1-vs-99 evaluation candidate generation. |
| `data-scientist` | Pending Phase 5 | Exploratory Data Analysis, statistical distributions, duration modeling | 19 Jupyter research notebooks in `ml/notebooks/`. |
| `data-storytelling` | Pending Phase 5 | Notebook narrative structure, Key Insights, visual clarity | Indonesian/English explanatory Markdown sections in all notebooks. |
| `matplotlib` | Pending Phase 5-8 | Publication-quality 200+ DPI chart generation | Visual asset outputs in `ml/visualizations/` across 9 categories. |
| `pytest-skill` | Pending Phase 0-10 | Unit testing for backend, ML math, and FL client updates | Comprehensive test suites across `ml/tests/`, `apps/api/tests/`. |

---

*This ledger will be continuously updated as each phase transitions from Planning to Active Implementation.*
