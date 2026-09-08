import { useMemo, useState } from "react";
import {
    collection,
    getDocs,
    query,
    where,
    serverTimestamp,
    doc,
    setDoc,
} from "firebase/firestore";
import { Link } from "react-router-dom";

import { db } from "../services/firebase";

const PARTY_ID = "halloween-25";

const normalizeName = (name) =>
    name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

function RSVP() {
    const [searchName, setSearchName] =
        useState("");

    const [searching, setSearching] =
        useState(false);

    const [searchError, setSearchError] =
        useState("");

    const [invitation, setInvitation] =
        useState(null);

    const [responses, setResponses] =
        useState({});

    const [submitted, setSubmitted] =
        useState(false);

    const [submitting, setSubmitting] =
        useState(false);

    const [submitError, setSubmitError] =
        useState("");

    /*
     * ==========================================
     * SEARCH INVITATION
     * ==========================================
     */

    const handleSearch = async (event) => {
        event.preventDefault();

        const normalizedSearch =
            normalizeName(searchName);

        if (!normalizedSearch) {
            setSearchError(
                "Please enter your name."
            );
            return;
        }

        setSearching(true);
        setSearchError("");
        setInvitation(null);
        setSubmitError("");

        try {
            const lookupRef = collection(
                db,
                "parties",
                PARTY_ID,
                "rsvpLookup"
            );

            /*
             * Search by exact normalized name first.
             */

            const exactQuery = query(
                lookupRef,
                where(
                    "nameLower",
                    "==",
                    normalizedSearch
                )
            );

            const exactSnapshot =
                await getDocs(exactQuery);

            let matches =
                exactSnapshot.docs;

            /*
             * If there isn't an exact match,
             * load the small public lookup collection
             * and allow partial name searching.
             *
             * This is appropriate for a small party.
             */

            if (matches.length === 0) {
                const allSnapshot =
                    await getDocs(lookupRef);

                matches =
                    allSnapshot.docs.filter(
                        (guestDoc) => {
                            const data =
                                guestDoc.data();

                            const guestName =
                                data.nameLower ??
                                "";

                            const plusOneName =
                                normalizeName(
                                    data.plusOne ??
                                        ""
                                );

                            return (
                                guestName.includes(
                                    normalizedSearch
                                ) ||
                                plusOneName.includes(
                                    normalizedSearch
                                )
                            );
                        }
                    );
            }

            if (matches.length === 0) {
                setSearchError(
                    "We couldn't find an invitation with that name. Please check the spelling and try again."
                );

                return;
            }

            /*
             * If there are multiple matches,
             * use the first exact match.
             *
             * We can improve this later with a
             * "Which one is you?" selection screen
             * if needed.
             */

            const match =
                matches[0];

            const data =
                match.data();

            const members = [
                {
                    id: match.id,
                    name: data.name,
                    type: "guest",
                },
            ];

            if (
                data.plusOne?.trim()
            ) {
                members.push({
                    id: `${match.id}-plus-one`,
                    name: data.plusOne.trim(),
                    type: "plusOne",
                });
            }

            const initialResponses =
                {};

            members.forEach(
                (member) => {
                    initialResponses[
                        member.id
                    ] = {
                        attending: "",
                        dietaryRestrictions: "",
                    };
                }
            );

            setInvitation({
                id: match.id,
                name: data.name,
                plusOne:
                    data.plusOne?.trim() || "",
                members,
            });

            setResponses(
                initialResponses
            );
        } catch (error) {
            console.error(
                "Error searching RSVP invitations:",
                error
            );

            setSearchError(
                "We couldn't search invitations right now. Please try again."
            );
        } finally {
            setSearching(false);
        }
    };

    /*
     * ==========================================
     * RESPONSE CHANGES
     * ==========================================
     */

    const updateResponse = (
        memberId,
        field,
        value
    ) => {
        setResponses(
            (current) => ({
                ...current,

                [memberId]: {
                    ...current[memberId],
                    [field]: value,
                },
            })
        );
    };

    /*
     * ==========================================
     * VALIDATION
     * ==========================================
     */

    const allResponsesComplete =
        useMemo(() => {
            if (!invitation) {
                return false;
            }

            return invitation.members.every(
                (member) =>
                    responses[
                        member.id
                    ]?.attending
            );
        }, [
            invitation,
            responses,
        ]);

    /*
     * ==========================================
     * SUBMIT RSVP
     * ==========================================
     */

    const handleSubmit = async (
        event
    ) => {
        event.preventDefault();

        if (
            !invitation ||
            !allResponsesComplete ||
            submitting
        ) {
            return;
        }

        setSubmitting(true);
        setSubmitError("");

        try {
            const guestResponse =
                responses[
                    invitation.id
                ];

            const plusOneMember =
                invitation.members.find(
                    (member) =>
                        member.type ===
                        "plusOne"
                );

            const submission = {
                guestId:
                    invitation.id,

                guest: {
                    name:
                        invitation.name,

                    attending:
                        guestResponse.attending,

                    dietaryRestrictions:
                        guestResponse
                            .dietaryRestrictions
                            .trim(),
                },

                submittedAt:
                    serverTimestamp(),
            };

            if (
                plusOneMember
            ) {
                const plusOneResponse =
                    responses[
                        plusOneMember.id
                    ];

                submission.plusOne = {
                    name:
                        invitation.plusOne,

                    attending:
                        plusOneResponse.attending,

                    dietaryRestrictions:
                        plusOneResponse
                            .dietaryRestrictions
                            .trim(),
                };
            }

            await setDoc(
                doc(
                    db,
                    "rsvpSubmissions",
                    invitation.id
                ),
                submission
            );

            setSubmitted(true);
        } catch (error) {
            console.error(
                "Error submitting RSVP:",
                error
            );

            setSubmitError(
                "Something went wrong submitting your RSVP. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    };

    /*
     * ==========================================
     * START OVER
     * ==========================================
     */

    const startOver = () => {
        setInvitation(null);
        setSearchName("");
        setSearchError("");
        setResponses({});
        setSubmitError("");
        setSubmitted(false);
    };

    /*
     * ==========================================
     * SUCCESS
     * ==========================================
     */

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
                        Thanks for letting us
                        know. We&apos;re looking
                        forward to celebrating
                        with you!
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

    /*
     * ==========================================
     * SEARCH SCREEN
     * ==========================================
     */

    if (!invitation) {
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
                            Find Your Invitation
                        </h1>

                        <p>
                            Enter your first or
                            last name below to
                            find your invitation.
                        </p>
                    </div>

                    <form
                        onSubmit={
                            handleSearch
                        }
                    >
                        <div className="rsvp-field">
                            <label htmlFor="searchName">
                                Your name
                            </label>

                            <input
                                id="searchName"
                                type="text"
                                value={
                                    searchName
                                }
                                onChange={(
                                    event
                                ) =>
                                    setSearchName(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="First or last name"
                                autoFocus
                            />
                        </div>

                        {searchError && (
                            <div className="rsvp-error">
                                {searchError}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="invite-rsvp-button rsvp-submit"
                            disabled={
                                searching
                            }
                        >
                            {searching
                                ? "Searching..."
                                : "Find My Invitation"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    /*
     * ==========================================
     * RSVP FORM
     * ==========================================
     */

    return (
        <div className="rsvp-page">
            <div className="rsvp-card">
                <button
                    type="button"
                    className="rsvp-back rsvp-back-button"
                    onClick={
                        startOver
                    }
                >
                    ← Search again
                </button>

                <div className="rsvp-header">
                    <span className="invite-eyebrow">
                        We Found You
                    </span>

                    <h1>
                        {invitation.name}
                    </h1>

                    <p>
                        Please RSVP for
                        everyone included
                        on your invitation.
                    </p>
                </div>

                <form
                    onSubmit={
                        handleSubmit
                    }
                >
                    {invitation.members.map(
                        (member) => {
                            const response =
                                responses[
                                    member.id
                                ] ?? {};

                            return (
                                <div
                                    className="rsvp-member-card"
                                    key={
                                        member.id
                                    }
                                >
                                    <div className="rsvp-member-header">
                                        <div>
                                            <span className="invite-eyebrow">
                                                {member.type ===
                                                "guest"
                                                    ? "Guest"
                                                    : "Plus One"}
                                            </span>

                                            <h2>
                                                {
                                                    member.name
                                                }
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="rsvp-field">
                                        <label>
                                            Will you be
                                            joining us?
                                        </label>

                                        <div className="rsvp-options">
                                            <label className="rsvp-option">
                                                <input
                                                    type="radio"
                                                    name={`attending-${member.id}`}
                                                    value="yes"
                                                    checked={
                                                        response.attending ===
                                                        "yes"
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateResponse(
                                                            member.id,
                                                            "attending",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />

                                                <span>
                                                    Yes,
                                                    I&apos;ll
                                                    be
                                                    there!
                                                </span>
                                            </label>

                                            <label className="rsvp-option">
                                                <input
                                                    type="radio"
                                                    name={`attending-${member.id}`}
                                                    value="no"
                                                    checked={
                                                        response.attending ===
                                                        "no"
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        updateResponse(
                                                            member.id,
                                                            "attending",
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                />

                                                <span>
                                                    Sorry,
                                                    I
                                                    can&apos;t
                                                    make
                                                    it
                                                </span>
                                            </label>
                                        </div>
                                    </div>

                                    {response.attending ===
                                        "yes" && (
                                        <div className="rsvp-field">
                                            <label
                                                htmlFor={`diet-${member.id}`}
                                            >
                                                Dietary
                                                restrictions
                                            </label>

                                            <textarea
                                                id={`diet-${member.id}`}
                                                value={
                                                    response.dietaryRestrictions ??
                                                    ""
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateResponse(
                                                        member.id,
                                                        "dietaryRestrictions",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="Allergies, vegetarian, dietary needs, etc."
                                                rows="3"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        }
                    )}

                    {submitError && (
                        <div className="rsvp-error">
                            {submitError}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="invite-rsvp-button rsvp-submit"
                        disabled={
                            submitting ||
                            !allResponsesComplete
                        }
                    >
                        {submitting
                            ? "Sending RSVP..."
                            : "Submit RSVP"}
                    </button>

                    {!allResponsesComplete && (
                        <p className="rsvp-required-note">
                            Please select an RSVP
                            response for everyone
                            on your invitation.
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}

export default RSVP;