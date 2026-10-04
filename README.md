# Coaster Coast

A Florida theme park ride planner built for ISM 6225 Assignment 1 (Look and Feel) at the University of South Florida.

**Live site:** https://sheikhrobinemon-usf.github.io/Assignment_LookAndFeel/

## Pages

* [index.html](index.html): Home. A rider height checker that shows which of 27 headline rides a rider can board at nine Florida parks, plus a table of 2024 park attendance.
* [managerides.html](managerides.html): Mock CRUD. Search, filter and sort rides; add, view, edit and delete them with validated forms and undo.
* [analytics.html](analytics.html): Four D3.js charts covering visitors per park, visitors by operator from 2021 to 2024, the fastest rides and rides open at each height. Every chart has a data table view.
* [aboutus.html](aboutus.html): About the developer, how the site was built and the technology used.

## How it works

* Plain HTML, CSS and JavaScript with no build step and no CSS framework.
* Ride data lives in `js/data.js`. The Manage rides page saves changes to `sessionStorage`, so edits show up on the home page and the analytics charts in the same browser tab. Reset sample data restores the original list.
* Charts use a trimmed D3.js v7 build (`js/vendor/d3.custom.min.js`, about 60 KB) that loads only on the analytics page.
* Responsive down to 320 px wide, with dark mode, keyboard support and reduced motion support.

## Data sources

* Attendance: TEA/AECOM Global Experience Index, North America top 20 parks, 2021 to 2024.
* Ride minimum heights, top speeds and opening years: official park pages, cross checked with each ride's Wikipedia article (October 2026).

## Run it locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

Built by Sheikh Robin Emon.
