## ADDED Requirements

### Requirement: Automatic Language Detection for IRCC Search
The system MUST detect input language and return results in the corresponding language.

#### Scenario: User searches in Chinese
- **WHEN** user enters Chinese text (e.g., "学签")
- **THEN** the system detects Chinese input
- **AND** calls IRCC API with `lang=zh`
- **AND** displays Chinese results

#### Scenario: User searches in English
- **WHEN** user enters English text (e.g., "study permit")
- **THEN** the system detects English input
- **AND** calls IRCC API with `lang=en`
- **AND** displays English results

#### Scenario: Mixed input defaults to Chinese
- **WHEN** user enters mixed Chinese and English text
- **THEN** the system defaults to Chinese (`lang=zh`)

### Requirement: Language-Consistent Detail View
The system MUST display article details in the same language as the search.

#### Scenario: Viewing detail after Chinese search
- **WHEN** user clicks a result from Chinese search
- **THEN** detail is fetched with `lang=zh`

#### Scenario: Viewing detail after English search
- **WHEN** user clicks a result from English search
- **THEN** detail is fetched with `lang=en`
