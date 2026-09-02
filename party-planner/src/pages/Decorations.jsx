function Decorations() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            Party Design
          </span>
          <h1>Decorations</h1>
          <p>
            Organize decor ideas, shopping links,
            costs, quantities, and setup locations.
          </p>
        </div>

        <button className="primary-button">
          + Add Decoration
        </button>
      </header>

      <div className="empty-page-card">
        <span>Decoration planning is coming soon.</span>
      </div>
    </div>
  );
}

export default Decorations;