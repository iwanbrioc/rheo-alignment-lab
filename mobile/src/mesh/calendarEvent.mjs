/** Matrix times are local wall times; a date must be explicitly chosen for export. */
export function calendarEvent(session, day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Choose a date as YYYY-MM-DD.');
  const [year, month, date] = day.split('-').map(Number);
  function at(time) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Invalid activity time.');
    const [hour, minute] = time.split(':').map(Number);
    const value = new Date(year, month - 1, date, hour, minute);
    if (value.getFullYear() !== year || value.getMonth() !== month - 1 ||
        value.getDate() !== date || value.getHours() !== hour || value.getMinutes() !== minute)
      throw new Error('This date or local time does not exist. Choose another.');
    return value;
  }
  const startDate = at(session.start), endDate = at(session.end);
  if (endDate <= startDate) throw new Error('Activity end must be after its start.');
  return {
    title: `${session.demo ? '[Illustrative] ' : ''}${session.title}`,
    startDate, endDate,
    location: session.demo ? 'Illustrative location — not a real venue' : session.space,
    notes: session.demo
      ? 'Rheo fictional sample. This is not a real event, booking or confirmed venue.'
      : `${session.description || ''}\nAdded from Rheo. Confirm arrangements with the host.`,
  };
}
export function localDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
