## ADDED Requirements

### Requirement: Cal.com Embedded Booking
The system MUST provide consultation booking via embedded Cal.com calendar widget.

#### Scenario: Guest views booking calendar
- **WHEN** guest navigates to `/consultation`
- **THEN** an embedded Cal.com calendar is displayed
- **AND** available time slots are shown based on admin's Cal.com settings

#### Scenario: Guest books a consultation
- **WHEN** guest selects an available time slot in Cal.com widget
- **AND** fills in required information (name, email, notes)
- **AND** confirms the booking
- **THEN** booking is created in Cal.com
- **AND** confirmation email is sent by Cal.com

#### Scenario: Admin manages availability
- **WHEN** admin logs into Cal.com dashboard (external)
- **THEN** admin can set available hours, block dates, and manage bookings

## REMOVED Requirements

### Requirement: Free-form Deadline Input
**Reason**: Replaced by Cal.com embedded booking
**Migration**: Existing consultations with deadline remain in database for historical reference

### Requirement: Supabase Consultation Submission
**Reason**: Booking handled entirely by Cal.com
**Migration**: Existing data preserved; new bookings go through Cal.com
