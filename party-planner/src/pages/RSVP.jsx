import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../services/firebase";

function RSVP() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        attending: "",
        guests: "1",
        dietaryRestrictions: "",
        message: "",
    });

    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            await addDoc(collection(db, "rsvps"), {
                name: formData.name.trim(),
                email: formData.email.trim(),
                attending: formData.attending,
                guests:
                    formData.attending === "yes"
                        ? Number(formData.guests)
                        : 0,
                dietaryRestrictions:
                    formData.dietaryRestrictions.trim(),
                message: formData.message.trim(),
                submittedAt: serverTimestamp(),
            });

            setSubmitted(true);
        } catch (error) {
            console.error("RSVP submission error:", error);
            setError(
                "Something went wrong submitting your RSVP. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="rsvp-page">
                <div className="rsvp-card rsvp-success">

                    <div className="rsvp-success-icon">
                        🎃
                    </div>

                    <span className="invite-eyebrow">
                        RSVP Received
                    </span>

                    <h1>
                        You&apos;re on the list!
                    </h1>

                    <p>
                        Thanks for letting us know. We&apos;re looking
                        forward to celebrating with you!
                    </p>

                    <Link
                        to="/invite"
                        className="invite-secondary-button"
                    >
                        Back to Invitation
                    </Link>

                </div>
            </div>
        );
    }

    return (
        <div className="rsvp-page">
            <div className="rsvp-card">

                <Link
                    to="/invite"
                    className="rsvp-back"
                >
                    ← Back to invitation
                </Link>

                <div className="rsvp-header">
                    <span className="invite-eyebrow">
                        Mattie&apos;s 25th
                    </span>

                    <h1>
                        RSVP
                    </h1>

                    <p>
                        Let us know if you&apos;ll be joining us
                        for the Halloween celebration.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>

                    <div className="rsvp-field">
                        <label htmlFor="name">
                            Your name
                        </label>

                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="First and last name"
                            required
                        />
                    </div>

                    <div className="rsvp-field">
                        <label htmlFor="email">
                            Email
                        </label>

                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="rsvp-field">
                        <label>
                            Will you be joining us?
                        </label>

                        <div className="rsvp-options">

                            <label className="rsvp-option">
                                <input
                                    type="radio"
                                    name="attending"
                                    value="yes"
                                    checked={
                                        formData.attending === "yes"
                                    }
                                    onChange={handleChange}
                                    required
                                />

                                <span>
                                    Yes, I&apos;ll be there!
                                </span>
                            </label>

                            <label className="rsvp-option">
                                <input
                                    type="radio"
                                    name="attending"
                                    value="no"
                                    checked={
                                        formData.attending === "no"
                                    }
                                    onChange={handleChange}
                                />

                                <span>
                                    Sorry, I can&apos;t make it
                                </span>
                            </label>

                        </div>
                    </div>

                    {formData.attending === "yes" && (
                        <div className="rsvp-field">
                            <label htmlFor="guests">
                                Number attending
                            </label>

                            <select
                                id="guests"
                                name="guests"
                                value={formData.guests}
                                onChange={handleChange}
                            >
                                <option value="1">
                                    Just me
                                </option>

                                <option value="2">
                                    2 people
                                </option>

                                <option value="3">
                                    3 people
                                </option>

                                <option value="4">
                                    4 people
                                </option>

                                <option value="5">
                                    5 people
                                </option>

                                <option value="6">
                                    6 people
                                </option>
                            </select>
                        </div>
                    )}

                    {formData.attending === "yes" && (
                        <div className="rsvp-field">
                            <label htmlFor="dietaryRestrictions">
                                Dietary restrictions
                            </label>

                            <textarea
                                id="dietaryRestrictions"
                                name="dietaryRestrictions"
                                value={
                                    formData.dietaryRestrictions
                                }
                                onChange={handleChange}
                                placeholder="Let us know about any allergies or dietary restrictions."
                                rows="3"
                            />
                        </div>
                    )}

                    <div className="rsvp-field">
                        <label htmlFor="message">
                            Anything else?
                        </label>

                        <textarea
                            id="message"
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            placeholder="Optional"
                            rows="3"
                        />
                    </div>

                    {error && (
                        <div className="rsvp-error">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="invite-rsvp-button rsvp-submit"
                        disabled={loading}
                    >
                        {loading
                            ? "Sending RSVP..."
                            : "Submit RSVP"}
                    </button>

                </form>

            </div>
        </div>
    );
}

export default RSVP;