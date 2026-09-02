function Tasks() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            To Do
          </span>
          <h1>Tasks</h1>
          <p>
            Keep track of everything that needs
            to happen before party day.
          </p>
        </div>

        <button className="primary-button">
          + Add Task
        </button>
      </header>

      <div className="empty-page-card">
        <span>Task management is coming soon.</span>
      </div>
    </div>
  );
}

export default Tasks;