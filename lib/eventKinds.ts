/** How each kind of event is labelled and coloured across the product. */
export const KIND_LABEL: Record<string, string> = {
  summit: 'Annual Summit',
  webinar: 'Webinar',
  networking: 'Networking',
  academic: 'Academic',
  other: 'Event',
};

export const KIND_TONE: Record<string, string> = {
  summit: 'brand',
  webinar: 'navy',
  networking: 'warn',
  academic: 'ok',
  other: 'neutral',
};

export const EVENT_KINDS = ['summit', 'webinar', 'networking', 'academic'] as const;
