## ADDED Requirements
### Requirement: IRCC Content Search
The system MUST provide real-time search results from the IRCC Help Centre API.

#### Scenario: User searches for a topic
- **WHEN** the user types "work permit" in the search bar
- **THEN** the system fetches results from `/search?q=work permit`
- **AND** displays a list of relevant questions with titles and snippets

### Requirement: Multi-language Details
The system MUST display full article content in the user's preferred language (or fallback to English) with Markdown formatting.

#### Scenario: Viewing an article
- **WHEN** the user clicks on a search result
- **THEN** the system fetches details from `/question/{qnum}?format=markdown`
- **AND** renders the Markdown content in a readable format
