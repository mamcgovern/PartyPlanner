# Party Planner

A reusable party planning web app built with React, Vite, Firebase, and Firestore.

Party Planner is designed to keep the major pieces of event planning in one place, including guests, food and drinks, shopping, decorations, tasks, and notes. The current party being planned is a 25th birthday Halloween party, but the app is being built with reuse in mind for future events.

## Features

### Dashboard
A central overview of the party planning process.

The dashboard is intended to surface important information from the rest of the app, including guest counts, menu planning, shopping progress, decorations, and upcoming tasks.

### Guests
Manage the guest list and RSVP information.

Features include:

- Add, edit, and delete guests
- Track RSVP status
- Add an optional plus one
- Track the plus one's RSVP separately
- Search and filter guests
- Track dietary notes and other guest notes
- Set an expected attendance count for planning purposes

RSVP statuses include:

- No Response
- Attending
- Maybe
- Declined

The expected attendance count is separate from confirmed RSVPs and is used when estimating food and drink quantities.

### Food & Drinks
Plan the party menu and distinguish between homemade recipes and purchased items.

Food categories include:

- Appetizer
- Main
- Side
- Dessert
- Snack
- Other

Drink categories include:

- Alcoholic
- Non-Alcoholic

Each menu item can be either:

#### Recipe / Homemade
Recipes can include:

- Planned servings
- Recipe yield
- Ingredients
- Standardized ingredient units
- Instructions
- Notes

Ingredient quantities automatically scale based on the number of planned servings.

#### Purchased
Purchased food and drinks can include:

- Planned servings
- Quantity to buy
- Purchase unit
- Store or vendor
- Estimated cost
- Shopping link
- Notes

### Shopping
The shopping list is automatically generated from the Food & Drinks section.

It includes:

- Purchased food and drink items
- Ingredients required by homemade recipes
- Automatically scaled recipe quantities
- Duplicate ingredients combined into a single shopping item
- Unit conversion for compatible measurements
- Editable store information
- Editable estimated cost
- Purchased / gathered status
- Already Owned status
- Shopping progress
- Estimated remaining cost

Compatible recipe measurements are converted and combined automatically. For example, `8 oz` and `1 lb` of the same ingredient can be combined into one total.

Items with units that cannot be safely converted remain in one shopping row but display their separate quantities.

### Decorations
Plan and track party decorations.

Each decoration can include:

- Name
- Status
- Quantity
- Estimated cost
- Store
- Shopping link
- Photo link
- Inspiration link
- Notes

Decoration statuses include:

- Need to Buy
- Purchased
- DIY
- Ready

Photo links display directly on decoration cards and include a preview while editing.

### Tasks
A dedicated area for party planning tasks and deadlines.

This section is still being developed.

### Notes
A place to keep miscellaneous party planning notes.

This section is still being developed.

## Tech Stack

- React
- Vite
- React Router
- Firebase
- Cloud Firestore
- CSS

## Firestore Structure

The current party uses the document:

```text
parties/halloween-25