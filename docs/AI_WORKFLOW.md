# How AI works in HubMI

Four pictures for the jury. Blue = AI step, white = data and checks computed by code, green = a person decides.
Nothing the AI writes is published or sent without a human click, and every AI text in the app carries the label „Propozycja AI”.

## 1. Overview

Three modules share one AI core. Personal data (phone, e-mail, PESEL) is removed before anything reaches the AI model (the provider is configurable). The answer is validated: only the identifiers it was given, quotes copied word for word, no invented numbers. Search by words and meaning feeds Matchmaking and the Idea creator.

```mermaid
%%{init: {"theme":"base","themeVariables":{"background":"#FFFFFF","primaryColor":"#FFFFFF","primaryBorderColor":"#1F3A8A","primaryTextColor":"#151A23","lineColor":"#6B7487","fontFamily":"Inter, Arial, Liberation Sans, Noto Sans, sans-serif","fontSize":"16px"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":50,"padding":14,"wrappingWidth":260}}}%%
flowchart LR
    M(["Matchmaking"]):::data --> P
    C(["Idea creator"]):::data --> P
    W(["Middleman"]):::data --> P
    S("Search<br/>words + meaning"):::data -.-> M
    S -.-> C
    subgraph core["Shared AI core"]
        direction LR
        P("Remove<br/>personal data"):::data --> A("AI model"):::ai
        A --> V("Validate answer<br/>given IDs, exact quotes,<br/>no invented numbers"):::data
    end
    V --> L("AI proposal<br/>label"):::ai
    L --> H("Human decides"):::human
    H --> R(["ROPS"]):::human
    style core fill:#F6F7F9,stroke:#D9DDE4,color:#4B5565
    classDef ai fill:#E8EDFA,stroke:#1F3A8A,stroke-width:2px,color:#1F3A8A,font-weight:bold
    classDef data fill:#FFFFFF,stroke:#6B7487,stroke-width:1.5px,color:#151A23
    classDef human fill:#E3F2EA,stroke:#1D6B48,stroke-width:2px,color:#1D6B48,font-weight:bold
```

## 2. Matchmaking

The ranking comes first, without AI (keywords + meaning, 0.8 vectors / 0.2 keywords). The AI then picks at most 3 of 15 candidates and one challenge of the 48 on the Challenges Map. Quotes are checked word for word. Only the area and the challenge are stored for ROPS trends, never the description.

```mermaid
%%{init: {"theme":"base","themeVariables":{"background":"#FFFFFF","primaryColor":"#FFFFFF","primaryBorderColor":"#1F3A8A","primaryTextColor":"#151A23","lineColor":"#6B7487","fontFamily":"Inter, Arial, Liberation Sans, Noto Sans, sans-serif","fontSize":"16px"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":50,"padding":14,"wrappingWidth":260}}}%%
flowchart LR
    D(["Problem<br/>description"]):::data --> S("Hybrid search<br/>words + meaning"):::data
    S --> C("15 candidates"):::data
    C --> A("AI picks ≤ 3<br/>+ 1 challenge"):::ai
    A --> Q("IDs and quotes<br/>checked"):::data
    Q --> H("Shown as<br/>AI proposal"):::human
    A -.-> T("Stats: area<br/>+ challenge only"):::data
    T -.-> R(["ROPS trends"]):::human
    classDef ai fill:#E8EDFA,stroke:#1F3A8A,stroke-width:2px,color:#1F3A8A,font-weight:bold
    classDef data fill:#FFFFFF,stroke:#6B7487,stroke-width:1.5px,color:#151A23
    classDef human fill:#E3F2EA,stroke:#1D6B48,stroke-width:2px,color:#1D6B48,font-weight:bold
```

## 3. Idea creator

„Check my card” combines rules computed from the canvas with AI points, each with its evidence (the author's canvas answer or a quote from a similar Library innovation). The grant draft is written by AI from the card and canvas; its budget is computed by code from the costs the author ticked, each with [amount]. Nothing is added without the author's click, and sending to ROPS is a separate step.

```mermaid
%%{init: {"theme":"base","themeVariables":{"background":"#FFFFFF","primaryColor":"#FFFFFF","primaryBorderColor":"#1F3A8A","primaryTextColor":"#151A23","lineColor":"#6B7487","fontFamily":"Inter, Arial, Liberation Sans, Noto Sans, sans-serif","fontSize":"16px"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":50,"padding":14,"wrappingWidth":260}}}%%
flowchart LR
    I(["Idea card +<br/>canvas answers"]):::data --> R1("Rules<br/>from canvas"):::data
    I --> X("AI points<br/>with evidence"):::ai
    L(["Similar Library<br/>innovations"]):::data --> X
    I --> B("Budget computed<br/>from canvas"):::data
    I --> G("AI grant draft"):::ai
    B --> G
    R1 --> C("Check my card"):::data
    X --> C
    C --> H("Author clicks<br/>to add"):::human
    G --> H
    H --> S("Send to ROPS"):::human
    S --> RV(["ROPS reviews"]):::human
    classDef ai fill:#E8EDFA,stroke:#1F3A8A,stroke-width:2px,color:#1F3A8A,font-weight:bold
    classDef data fill:#FFFFFF,stroke:#6B7487,stroke-width:1.5px,color:#151A23
    classDef human fill:#E3F2EA,stroke:#1D6B48,stroke-width:2px,color:#1D6B48,font-weight:bold
```

## 4. Middleman

Fit and materials are computed from ROPS data, not by AI. The AI drafts the service card without costs; the institution edits it and sends it to ROPS.

```mermaid
%%{init: {"theme":"base","themeVariables":{"background":"#FFFFFF","primaryColor":"#FFFFFF","primaryBorderColor":"#1F3A8A","primaryTextColor":"#151A23","lineColor":"#6B7487","fontFamily":"Inter, Arial, Liberation Sans, Noto Sans, sans-serif","fontSize":"16px"},"flowchart":{"curve":"basis","nodeSpacing":40,"rankSpacing":50,"padding":14,"wrappingWidth":260}}}%%
flowchart LR
    N(["Innovation +<br/>institution"]):::data --> F("Facts from data<br/>fit, materials"):::data
    N --> A("AI draft<br/>no costs"):::ai
    F --> S("Service card"):::data
    A --> S
    S --> E("Institution<br/>edits"):::human
    E --> R(["Sent to ROPS"]):::human
    classDef ai fill:#E8EDFA,stroke:#1F3A8A,stroke-width:2px,color:#1F3A8A,font-weight:bold
    classDef data fill:#FFFFFF,stroke:#6B7487,stroke-width:1.5px,color:#151A23
    classDef human fill:#E3F2EA,stroke:#1D6B48,stroke-width:2px,color:#1D6B48,font-weight:bold
```

## Measured results

| What | Result |
|---|---|
| ROPS test set, 230 queries: right innovation in top 3 | **100%** |
| Everyday descriptions (40) / unusual queries (41): top 3 | **100% / 98%** |
| Right challenge from the Challenges Map, with AI (48) | **96%** |
| Problems outside the Library flagged as „no match” (80) | **94%** |

Source: `evals/results.md`. Images for slides: `pitch/diagramy/ai-*.png` (rendered with mermaid-cli from the `.mmd` files next to them, style in `render.css`).
