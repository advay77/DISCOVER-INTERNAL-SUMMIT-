/**
 * The DISCOVER annual summit playbook.
 *
 * Taken verbatim from the "Main Schedule" tab of DISCOVER 2024 Summit Planning.xlsx
 * (and repeated as "Misc" in the 2026 tracker). The month blocks in the sheet are
 * unlabelled, so they are expressed here as months before the event.
 *
 * Creating a summit instantiates this list as dated, assigned tasks.
 */

export type Step = {
  title: string;
  category: string;
  workstreamKey: string | null;
  monthsBefore: number;
  order: number;
  notes?: string;
};

let n = 0;
const step = (title: string, category: string, workstreamKey: string | null, monthsBefore: number, notes?: string): Step => ({
  title, category, workstreamKey, monthsBefore, order: n++, notes,
});

export const PLAYBOOK: Step[] = [
  // ── 6 months out
  step('Conference theme / title selected', 'Summit Logistics', 'summit', 6),
  step('Create the Summit task force meeting schedule', 'Summit Logistics', 'summit', 6),
  step('Start speaker outreach', 'Summit Invitation', 'summit', 6, 'Priority A invitations go out first.'),
  step('Confirm conference venue — contract, space requirements, amenities', 'Summit Logistics', 'summit', 6),
  step('Send calendar block-out to the Advisory Council', 'Summit Comms', 'comms', 6),

  // ── 5 months out
  step('Write the Save the Date email content', 'Summit Comms', 'comms', 5),
  step('Send the Save the Date blast to the mailing list', 'Summit Comms', 'comms', 5),
  step('Get the hotel link and group code for attendee reservations', 'Summit Logistics', 'summit', 5, 'Note the room block deadline — this caught us out last cycle.'),
  step('Build the promotional schedule — newsletter, social, eblasts, calendars', 'Summit Comms', 'comms', 5),
  step('Update the website — speakers, programme, exhibitor info', 'Summit Comms', 'comms', 5),
  step('Set up and test the attendee registration system', 'Summit Registration', 'comms', 5),
  step('Review and update the registration form and pricing', 'Summit Registration', 'comms', 5),
  step('Begin general session and speaker invitations — titles and session bullets', 'Summit Invitation', 'summit', 5),
  step('Announce that Summit registration is open', 'Summit Comms', 'comms', 5),
  step('Create DISCOVER flyers', 'Summit Comms', 'comms', 5),

  // ── 4 months out
  step('Final approval of graphics by the conference task force', 'Summit Comms', 'comms', 4),
  step('Finalise the text for attendee blast emails', 'Summit Comms', 'comms', 4),
  step('Start working on the programme', 'Summit Logistics', 'summit', 4),
  step('Design the onsite brochure with agenda and sponsors', 'Summit Comms', 'comms', 4),
  step('Chase speakers for confirmation, titles, bios and photos for the programme book', 'Summit Invitation', 'summit', 4),
  step('Prepare the cover image for the programme book and outreach campaign', 'Summit Comms', 'comms', 4),
  step("Ask the President for a welcome letter for the programme book", 'Summit Comms', 'comms', 4),

  // ── 3 months out
  step('Collect all sponsor logos for the programme book', 'Summit Comms', 'partnerships', 3),
  step('Send the important info email to sponsors — logistics, programme, booth', 'Summit Comms', 'partnerships', 3),
  step('Reach out to the photographer', 'Gala Dinner', 'summit', 3),
  step('Plan onsite promotional events — raffles, activities', 'Summit Day Support', 'summit', 3),
  step('Start setting up physical attendee registration', 'Summit Registration', 'summit', 3),

  // ── 2 months out
  step('Design the floorplan — HQ, speaking rooms, dining, sponsor tables', 'Summit Logistics', 'summit', 2),
  step('Confirm and obtain event cancellation insurance', 'Summit Logistics', 'summit', 2),
  step('Order supplies — badge holders, lanyards, signage materials', 'Summit Logistics', 'summit', 2),
  step('Register the task force and board for the meeting, comped', 'Summit Registration', 'summit', 2),
  step('Targeted outreach to local universities', 'Summit Registration', 'academic', 2),
  step('Find students to volunteer in exchange for free registration', 'Summit Day Support', 'academic', 2),
  step('Confirm hotel food and beverage', 'Summit Logistics', 'summit', 2),

  // ── 1 month out
  step('Send last-minute info email to speakers — sponsor logo, hotel, session info', 'Summit Invitation', 'summit', 1),
  step('Create the Know Before You Go content', 'Summit Comms', 'comms', 1),
  step('Open attendee registration desk comms and send the blast', 'Summit Registration', 'comms', 1),
  step('Define registration desk staffing — who is onsite and what each person owns', 'Summit Day Support', 'summit', 1),
  step('Make the agenda for the onsite staff meeting', 'Summit Day Support', 'summit', 1),
  step('Send the Know Before You Go eblast to attendees', 'Summit Comms', 'comms', 1),
  step('Close online registration', 'Summit Registration', 'comms', 1),
  step('Pack for the conference', 'Summit Logistics', 'summit', 1),
  step('Print all signage', 'Summit Comms', 'comms', 1),

  // ── event month
  step('Summit Planning Team meeting the day before — full hour, walk the agenda', 'Summit Day Support', 'summit', 0, 'The 2024 retro asked for this to be a full hour.'),
  step('Day-of volunteer briefing and shift assignment', 'Summit Day Support', 'summit', 0),
  step('Event!', 'Summit Day Support', 'summit', 0, 'All hands.'),

  // ── after
  step('Send the evaluation reminder to attendees', 'Summit Comms', 'comms', -1),
  step('Send the final attendee list to the task force', 'Summit Registration', 'summit', -1),
  step('Personalised thank you to every sponsor', 'Summit Comms', 'partnerships', -1),
  step('Personalised thank you to every speaker', 'Summit Comms', 'summit', -1),
  step('Run the post-summit retro — Plus / Delta / Consider', 'Summit Day Support', 'summit', -1),
  step('Reconcile speaker expenses', 'Summit Logistics', 'summit', -1),
  step('Appoint next year’s Summit task force', 'Summit Logistics', 'summit', -2),
];
