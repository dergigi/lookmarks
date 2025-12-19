# Lookmarks

Find what’s catching people’s eyes on Nostr: events with 👀 reactions, replies, or quotes.

Live: [`lookmarks.dergigi.com`](https://lookmarks.dergigi.com/)

## What are lookmarks?

A **lookmark** is when someone reacts to a post with 👀 — it’s like a bookmark, but less official.

It’s a little note that says “save this”, “check this out”, or “I’ll have a closer look later”. This app collects those signals and shows you the posts people are pointing at: **crowd-sourced bookmarks**.

Today, Lookmarks collects three types:

- **Reaction**: a NIP-25 reaction event (kind 7) with 👀 as the content.
- **Reply**: a kind 1 note that includes 👀 and uses NIP-10 threading (an `e` tag pointing to the original).
- **Quote**: a kind 1 note that includes 👀 and uses NIP-18 quoting (a `q` tag), i.e. “retweet with comment”.

## Dev

```bash
npm run dev
```

## Test / build

```bash
npm run test
npm run build
```

## Deploy

```bash
npm run deploy
```

License: MIT

