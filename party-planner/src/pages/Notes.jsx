function Notes() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            Ideas
          </span>
          <h1>Notes</h1>
          <p>
            Keep timelines, ideas, reminders,
            and random party thoughts together.
          </p>
        </div>

        <button className="primary-button">
          + Add Note
        </button>
      </header>

      <div className="empty-page-card">
        <span>Notes are coming soon.</span>
      </div>
    </div>
  );
}

export default Notes;