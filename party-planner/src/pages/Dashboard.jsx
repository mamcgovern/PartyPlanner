const tasks = [
  {
    id: 1,
    title: "Finalize party menu",
    due: "September 20",
  },
  {
    id: 2,
    title: "Order decorations",
    due: "October 1",
  },
  {
    id: 3,
    title: "Buy nonperishable drinks",
    due: "October 17",
  },
  {
    id: 4,
    title: "Final grocery run",
    due: "October 30",
  },
];

function Dashboard() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">
            Saturday, October 31
          </span>

          <h1>
            Mattie&apos;s 25th Halloween
            Birthday
          </h1>

          <p>
            Everything you need to plan
            the party, all in one place.
          </p>
        </div>

        <button className="primary-button">
          + Add Task
        </button>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">
            Invited
          </span>

          <strong>20</strong>

          <span className="stat-detail">
            total guests
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">
            Attending
          </span>

          <strong>6</strong>

          <span className="stat-detail">
            confirmed
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">
            Maybe
          </span>

          <strong>2</strong>

          <span className="stat-detail">
            undecided
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">
            Expected
          </span>

          <strong>10</strong>

          <span className="stat-detail">
            planning for
          </span>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-card countdown-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Countdown
              </span>

              <h2>Party Time</h2>
            </div>
          </div>

          <div className="countdown-number">
            59
          </div>

          <span className="countdown-label">
            days to go
          </span>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Attendance
              </span>

              <h2>Guest Planning</h2>
            </div>
          </div>

          <div className="attendance-number">
            10
          </div>

          <p className="muted">
            Expected guests
          </p>

          <div className="attendance-bar">
            <div
              className="attendance-bar-fill"
              style={{
                width: "50%",
              }}
            />
          </div>

          <div className="attendance-summary">
            <span>
              6 confirmed
            </span>

            <span>
              20 invited
            </span>
          </div>
        </div>

        <div className="dashboard-card wide-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Coming Up
              </span>

              <h2>Next Tasks</h2>
            </div>
          </div>

          <div className="task-preview-list">
            {tasks.map((task) => (
              <div
                className="task-preview"
                key={task.id}
              >
                <button
                  className="task-checkbox"
                  aria-label={`Complete ${task.title}`}
                />

                <div>
                  <strong>
                    {task.title}
                  </strong>

                  <span>
                    Due {task.due}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Menu
              </span>

              <h2>
                Party Recipes
              </h2>
            </div>
          </div>

          <div className="mini-list">
            <div className="mini-list-item">
              <div>
                <strong>
                  Buffalo Chicken Dip
                </strong>

                <span>
                  Appetizer
                </span>
              </div>

              <strong className="mini-value">
                12 servings
              </strong>
            </div>

            <div className="mini-list-item">
              <div>
                <strong>
                  Dirty Shirley
                </strong>

                <span>
                  Cocktail
                </span>
              </div>

              <strong className="mini-value">
                16 drinks
              </strong>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Groceries
              </span>

              <h2>
                Ingredient List
              </h2>
            </div>
          </div>

          <div className="attendance-number">
            8
          </div>

          <p className="muted">
            ingredients remaining
          </p>

          <div className="attendance-bar">
            <div
              className="shopping-progress-fill"
              style={{
                width: "40%",
              }}
            />
          </div>

          <div className="attendance-summary">
            <span>
              6 gathered
            </span>

            <span>
              14 total
            </span>
          </div>
        </div>

        <div className="dashboard-card wide-card">
          <div className="card-header">
            <div>
              <span className="card-eyebrow">
                Decorations
              </span>

              <h2>
                Party Setup
              </h2>
            </div>
          </div>

          <div className="shopping-summary">
            <div>
              <strong>6</strong>
              <span>
                ideas saved
              </span>
            </div>

            <div>
              <strong>2</strong>
              <span>
                purchased
              </span>
            </div>

            <div>
              <strong>4</strong>
              <span>
                remaining
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;