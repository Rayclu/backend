export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  INSTITUTION = 'institution',
  GROUP = 'group',
}

export enum EventCategory {
  CONFERENCE = 'conference',
  WORKSHOP = 'workshop',
  MEETING = 'meeting',
  SOCIAL = 'social',
  SPORTS = 'sports',
  CULTURAL = 'cultural',
  EDUCATIONAL = 'educational',
  NETWORKING = 'networking',
  OTHER = 'other',
}