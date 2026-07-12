# 修正 README 图片说明

## Goal

Fix the README screenshot gallery so each image is paired with the correct description, and remove the README design philosophy section that is no longer needed.

## Requirements

* Inspect the existing README screenshot table and the actual `docs/screenshots/*.png` contents.
* Reorder or relabel the README screenshot gallery so visible captions match the image contents.
* Remove the `设计理念` section from README.
* Keep the change scoped to documentation unless inspection reveals a broken asset reference.

## Acceptance Criteria

* [x] README screenshot captions accurately describe the images shown.
* [x] README no longer contains a `设计理念` section.
* [x] Existing screenshot asset links remain valid.

## Definition of Done

* README is reviewed after edits.
* A lightweight verification confirms all referenced screenshot paths exist.

## Out of Scope

* Renaming screenshot files.
* Changing game UI, screenshots, or gameplay copy.
* Updating implementation specs.

## Technical Notes

* `docs/screenshots/01-landing.png` currently shows a random event modal.
* `docs/screenshots/02-gameplay.png` currently shows the landing page.
* `docs/screenshots/03-event.png` currently shows character creation.
* `docs/screenshots/04-action.png` currently shows the main gameplay/action selection screen.
* `docs/screenshots/05-full-ui.png` currently shows an exam/event choice dialog with free input.
* `docs/screenshots/06-result.png` currently shows the hall of fame / result screen.
