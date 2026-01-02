## ADDED Requirements

### Requirement: Public Article Listing
The system MUST display a public listing of published Chinese articles.

#### Scenario: Visitor views article list
- **WHEN** visitor navigates to `/articles`
- **THEN** published articles are displayed in reverse chronological order
- **AND** each article shows title, excerpt, and published date

#### Scenario: Visitor clicks an article
- **WHEN** visitor clicks on an article in the list
- **THEN** visitor is navigated to `/articles/:slug`
- **AND** full article content is displayed

### Requirement: Article Detail Page
The system MUST display full article content on a dedicated page.

#### Scenario: Viewing article by slug
- **WHEN** visitor navigates to `/articles/my-article-slug`
- **THEN** the article title, content, and published date are displayed
- **AND** a back link to article list is shown

#### Scenario: Article not found
- **WHEN** visitor navigates to `/articles/non-existent-slug`
- **THEN** a 404 message is displayed

### Requirement: Admin Article Management
Admin MUST be able to create, edit, publish, and delete articles with slug and excerpt.

#### Scenario: Admin creates article with slug
- **WHEN** admin creates a new article
- **THEN** admin provides title, slug, excerpt, and content
- **AND** article is saved as draft (unpublished) by default

#### Scenario: Admin publishes article
- **WHEN** admin clicks publish on a draft article
- **THEN** article becomes visible on `/articles`
- **AND** `published_at` timestamp is set

#### Scenario: Admin unpublishes article
- **WHEN** admin clicks unpublish on a published article
- **THEN** article is hidden from `/articles`
- **AND** `published_at` is cleared
