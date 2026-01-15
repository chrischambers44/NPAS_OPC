# EC135 Question Bank (GitHub Pages)

A simple, fast, topic-based revision question bank.

## Use
- Open the site
- Pick a topic
- Quickfire 10 / 30
- Reveal answer when ready

## Admin (single source of truth)
Edit: `data/qbank_clean.csv`

A GitHub Action automatically regenerates:
- `data/qbank.json`
- `data/topics.json`

Workflow: `.github/workflows/build-qbank.yml`

## What does "Hidden" mean?
In this system, `visibility=Hidden` means **excluded from general users by default**.
On topic pages, users can opt-in via **include Hidden**.

This replaces the old FileMaker "reveal answer by unchecking" behaviour, which is now handled by the **Show / hide** button.
