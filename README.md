graph TD
    A[Developer pushes code] --> B[GitHub Repository]
    B --> C{GitHub Actions CI/CD}
    C --> D[Gitleaks Secret Scan]
    C --> E[Trivy Vulnerability Scan]
    C --> F[Docker Build Test]

    G[AgentSec Backend FastAPI] --> H[Claude Brain]
    H --> I[Analysis and Prioritization]

    D -->|Findings| G
    E -->|Findings| G
    F -->|Status| G

    G --> J[AgentSec Dashboard]
    G --> K[Auto-Remediation Engine]
    G --> L[Approval Workflow]
    L --> M[Slack Approve/Reject]
    G --> N[Slack Alerts]
    N --> O[Developer Phone]

    subgraph Tools
        T1[GitHub Tool]
        T2[Gitleaks Tool]
        T3[Trivy Tool]
        T4[GCP Tool]
        T5[SonarCloud]
    end
    T1 --> G
    T2 --> G
    T3 --> G
    T4 --> G
    T5 --> G
