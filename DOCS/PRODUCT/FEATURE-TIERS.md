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

## Tiers

| Capability | Free | Fellowship | Parish | Scholar |
|---|:---:|:---:|:---:|:---:|
| Mass, Office, calendar, map | ✓ | ✓ | ✓ | ✓ |
| All themes and accessibility controls | ✓ | ✓ | ✓ | ✓ |
| Local annotations | ✓ | ✓ | ✓ | ✓ |
| Self-contained annotated URL sharing | ✓ | ✓ | ✓ | ✓ |
| Print / PDF / portable exports | ✓ | ✓ | ✓ | ✓ |
| EcclesiDraw export | ✓ | ✓ | ✓ | ✓ |
| Cross-device synchronization |  | ✓ | ✓ | ✓ |
| Large shared collections |  | ✓ | ✓ | ✓ |
| Fellowship workspace |  | ✓ | ✓ | ✓ |
| Live collaboration and version history |  | ✓ | ✓ | ✓ |
| Newsletter composition |  | ✓ | ✓ | ✓ |
| Parish workspace |  |  | ✓ |  |
| Roles, approval, moderation, audit history |  |  | ✓ |  |
| Scheduled newsletter delivery |  |  | ✓ |  |
| Advanced semantic research |  |  |  | ✓ |
| Grounded AI exegesis |  |  |  | ✓ |

## Why the paid features are paid

### Fellowship

Fellowship features introduce persistent shared state: synchronization, storage, concurrent editing, and recoverable history. The subscription pays for coordination and retained shared data, not for reading Scripture or the liturgy.

### Parish

Parish features introduce institutional responsibility: roles, approvals, moderation, publication workflows, audit history, and scheduled delivery. They are organizational infrastructure rather than a larger reading font with a cassock on it.

### Scholar

Scholar features introduce material compute costs: richer embeddings, larger indexes, cross-corpus research, and grounded model inference.

## Entitlement integration

The app consumes a neutral entitlement provider. Authentication and billing belong to the central Bidller platform connection rather than being implemented independently inside St. Android's Missal.

The local/offline default provider grants the complete Free tier. A connected provider may add entitlements but must never revoke the Free tier's local-first capabilities.

## Portability covenant

1. Local annotations are exportable in an open, versioned JSON structure.
2. Shared URL fragments contain the selected passage, references, and chosen annotations.
3. Standalone HTML exports contain all composed content and require no backend.
4. EcclesiDraw exports remain Excalidraw-compatible rather than proprietary canvas blobs.
5. A subscription ending may disable hosted collaboration but must not make previously exported or locally stored content unreadable.
