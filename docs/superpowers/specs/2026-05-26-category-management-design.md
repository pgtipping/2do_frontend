# Category Management Design

## Goal

Build category management that feels smart during normal ledger cleanup.

The user should not manage technical rules first. They should edit a real transaction, and the app should ask how widely to apply that change.

## User Experience

Add a Categories tab with category create, rename, color change, hide, and restore.

When a ledger transaction category changes, show three choices if similar transactions exist:

1. Only this transaction.
2. Matching past transactions.
3. Matching past and future transactions.

Similar transactions match by merchant first, then by original bank narration when merchant is missing.

## Behavior Rules

Renaming a category keeps history together because the same category record keeps its identity.

Hiding a category removes it from future dropdowns, but old transactions still show it in reports and ledger history.

Changing one transaction can update matching past rows and can also save a future rule. The user chooses the scope before the wider change is applied.

## Safety

The app must show the number of matching transactions before applying a wider change.

Hidden categories must remain visible wherever old transactions reference them.

Future dropdowns should exclude hidden categories unless the current transaction already uses one.

## Testing

Repository tests should cover category create, update, hide, restore, matching transaction counts, and smart apply behavior.

Browser checks should cover creating a category, changing a transaction category, choosing a smart apply option, and confirming reports still use the updated category.
