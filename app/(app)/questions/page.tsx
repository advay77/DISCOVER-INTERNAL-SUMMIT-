import { redirect } from 'next/navigation';

/**
 * The Open Questions section was retired. Old links (notifications, bookmarks)
 * land on the dashboard instead of a 404. The data is kept in the database.
 */
export default function QuestionsPage() {
  redirect('/dashboard');
}
