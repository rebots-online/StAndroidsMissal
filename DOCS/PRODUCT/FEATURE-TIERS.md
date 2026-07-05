# St. Android's Missal — feature and subscription boundaries

## Product rule

The subscription boundary follows **ongoing cost, organizational scale, and hosted coordination**.
It must not follow basic legibility, access to the liturgy, or the user's ability to take their own work with them.

Therefore these capabilities remain free:

- reading the Mass and available Divine Office;
- the perpetual calendar and subway map;
- every theme, font-size, contrast, spacing, motion, light/dark, and guided-reading control;
- local highlights and annotations;
- self-contained annotated share URLs;
- print and browser PDF;
- Markdown, JSON, standalone HTML, and EcclesiDraw export;
- importing and reading a shared bundle without an account.

A recipient must be able to read a composed shared passage and its annotations without St. Android's Missal hosting the content. The URL fragment or exported file carries the composition. Hosting provides only the app shell and installer.

## Plans and add-ons

The commercial ladder begins with an individual subscription. Institutional adoption is not presumed.

| Capability | Free | Personal | Fellowship | Parish |
|---|:---:|:---:|:---:|:---:|
| Mass, Office, calendar, map | ✓ | ✓ | ✓ | ✓ |
| All themes and accessibility controls | ✓ | ✓ | ✓ | ✓ |
| Local annotations | ✓ | ✓ | ✓ | ✓ |
| Self-contained annotated URL sharing | ✓ | ✓ | ✓ | ✓ |
| Print / PDF / portable exports | ✓ | ✓ | ✓ | ✓ |
| EcclesiDraw export | ✓ | ✓ | ✓ | ✓ |
| Private cross-device synchronization |  | ✓ | ✓ | ✓ |
| Large private collections |  | ✓ | ✓ | ✓ |
| Personal version history |  | ✓ | ✓ | ✓ |
| Enhanced personal research allowance |  | ✓ | ✓ | ✓ |
| Fellowship workspace |  |  | ✓ | ✓ |
| Live collaboration and shared history |  |  | ✓ | ✓ |
| Newsletter composition |  |  | ✓ | ✓ |
| Parish workspace |  |  |  | ✓ |
| Roles, approval, moderation, audit history |  |  |  | ✓ |
| Scheduled newsletter delivery |  |  |  | ✓ |

### Scholar add-on

Scholar is an optional research add-on rather than an institutional plan. It may be attached to Personal, Fellowship, or Parish accounts.

It adds:

- larger semantic indexes;
- richer embeddings and cross-corpus research;
- higher-volume grounded research assistance;
- research-oriented export and citation workflows.

A private individual can therefore subscribe to **Personal + Scholar** without pretending to be a parish, fellowship, publisher, or committee.

## Why the paid features are paid

### Personal

Personal pays for private services with recurring costs: synchronized storage, recoverable history, larger personal collections, and a modest assisted-research allowance. It is the expected first commercial plan.

### Fellowship

Fellowship introduces persistent shared state: concurrent editing, shared libraries, live EcclesiDraw sessions, group version history, and newsletter composition. The subscription pays for coordination and retained shared data, not for reading Scripture or the liturgy.

### Parish

Parish introduces institutional responsibility: roles, approvals, moderation, publication workflows, audit history, and scheduled delivery. It is organizational infrastructure rather than a larger reading font with a cassock on it.

### Scholar add-on

Scholar covers material research-compute costs: richer embeddings, larger indexes, cross-corpus analysis, and grounded model inference. It is orthogonal to whether the subscriber is an individual or an institution.

## Entitlement integration

The app consumes a neutral entitlement provider. Authentication and billing belong to the central Bidller platform connection rather than being implemented independently inside St. Android's Missal.

The local/offline default provider grants the complete Free plan. A connected provider may add entitlements but must never revoke the Free plan's local-first capabilities.

The entitlement model therefore has two independent fields:

```text
plan: free | personal | fellowship | parish
addOns: scholar[]
```

## Portability covenant

1. Local annotations are exportable in an open, versioned JSON structure.
2. Shared URL fragments contain the selected passage, references, and chosen annotations.
3. Standalone HTML exports contain all composed content and require no backend.
4. EcclesiDraw exports remain Excalidraw-compatible rather than proprietary canvas blobs.
5. A subscription ending may disable hosted services but must not make previously exported or locally stored content unreadable.
