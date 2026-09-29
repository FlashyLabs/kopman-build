# On the FlashyOS mesh

Kopman Build is client work carried on the FlashyOS mesh — delivered to a specification, reviewed before delivery, and never open-licensed.

Its AAO charter is [`flashyos.roles.json`](flashyos.roles.json) — the single source the mesh
handshake and the directory fragment derive from, so two hand-written files can
never disagree. It declares **five roles**, and five roles are five agents:

| Role | Family | Human approval at/above | What it is accountable for |
|---|---|---|---|
| `delivery` | operations | HIGH | Owns delivery to the client and answers to the accountable human for what was promised. |
| `engineering` | engineering | MEDIUM | Builds the client work to the agreed specification and keeps it tested. |
| `review` | governance | HIGH | Reviews a change before it is delivered, because a defect delivered to a client is dearer than one caught in review. |
| `release` | operations | CRITICAL | Ships to the client environment. |
| `account` | support | LOW | The client’s point of contact — briefs the work and reports status on the agreed cadence. |

The charter validates against the estate's dependency-free AAO checker:

```bash
node vendor-aao-check.mjs validate flashyos.roles.json   # 0 issues
```

**Becoming a live organisation.** The charter is what a live org is provisioned
from. From a machine that holds `DATABASE_URL`:

```bash
npx tsx packages/api/scripts/provision-org-from-charter.ts \
  --charter flashyos.roles.json --tier FREE
```

The FREE tier allows five agents, which is exactly this charter's five roles.
Provisioning is a database write a person runs; committing the charter is the
half a repository can hold. The authoritative conformance check runs against the
live domain after deploy: `npx @flashyos/conformance <domain> --level 2`.

`directory.fragment.json` is this org's `directory/1` node: the org, one agent
per role, and the accountable person.
