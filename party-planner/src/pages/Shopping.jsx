function Shopping() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            Purchasing
          </span>
          <h1>Shopping List</h1>
          <p>
            Keep groceries, alcohol, supplies,
            and party purchases organized.
          </p>
        </div>

        <button className="primary-button">
          + Add Item
        </button>
      </header>

      <div className="empty-page-card">
        <span>Shopping list is coming soon.</span>
      </div>
    </div>
  );
}

export default Shopping;