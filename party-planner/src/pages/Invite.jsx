import { Link } from "react-router-dom";

function Invite() {
    return (
        <div className="invite-page">
            <div className="invite-card">

                <div className="invite-top">
                    <span className="invite-eyebrow">
                        You&apos;re Invited
                    </span>

                    <div className="invite-pumpkin">
                        🎃
                    </div>

                    <h1>
                        Mattie&apos;s
                        <span>25th Birthday</span>
                    </h1>

                    <p className="invite-subtitle">
                        A Halloween Birthday Party
                    </p>
                </div>

                <div className="invite-divider">
                    <span>✦</span>
                    <span>✦</span>
                    <span>✦</span>
                </div>

                <div className="invite-details">

                    <div className="invite-detail">
                        <span className="invite-detail-icon">☾</span>
                        <div>
                            <span className="invite-detail-label">
                                When
                            </span>
                            <strong>
                                Saturday, October 31, 2026
                            </strong>
                            <span>
                                Time coming soon
                            </span>
                        </div>
                    </div>

                    <div className="invite-detail">
                        <span className="invite-detail-icon">♧</span>
                        <div>
                            <span className="invite-detail-label">
                                Where
                            </span>
                            <strong>
                                Location coming soon
                            </strong>
                            <span>
                                Details will be provided before the party
                            </span>
                        </div>
                    </div>

                    <div className="invite-detail">
                        <span className="invite-detail-icon">✦</span>
                        <div>
                            <span className="invite-detail-label">
                                Dress Code
                            </span>
                            <strong>
                                Costumes encouraged
                            </strong>
                            <span>
                                Come dressed up and ready to celebrate!
                            </span>
                        </div>
                    </div>

                </div>

                <div className="invite-message">
                    <p>
                        Come celebrate 25 years of Mattie with a night
                        of Halloween fun, good food, drinks, and plenty
                        of reasons to party.
                    </p>
                </div>

                <Link
                    to="/invite/RSVP"
                    className="invite-rsvp-button"
                >
                    RSVP
                </Link>

                <p className="invite-footer">
                    Please RSVP by October 1, 2026
                </p>

            </div>
        </div>
    );
}

export default Invite;