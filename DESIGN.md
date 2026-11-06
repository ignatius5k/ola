# Match interface design specification

## Reference and scope

This specification translates the visible [Stripe web Home screen on Mobbin](https://mobbin.com/screens/fc5d4bcd-1d9a-4cf1-b2f0-cdecac3a1abf) and [Stripe Transactions screen](https://mobbin.com/screens/f706524f-2964-47a5-ba06-4fdf75779e0f) into Match's reconciliation workflow. The user's [specific Mobbin URL](https://mobbin.com/apps/stripe-web-eb1841ea-0570-46eb-941f-a8e5299355b9/50dedd10-202d-435f-ad76-0801b1cd3dc1/screens) redirected to login in the browser, so its precise screen selection could not be verified. The connected Mobbin MCP returned the cited Stripe screens and full resolution images, which are the visual basis for the measurements below. Treat measurements as estimates from 1920 × 1324 captures, not Stripe's source tokens.

The target includes every current Match screen: Overview, Transactions, Reviews, Transaction detail, Activity, and the three Sources & rules tabs. Retain Match's own name, data, navigation labels, and reviewer actions. Replicate the reference's layout, density, typography hierarchy, control styling, and interaction pattern. Do not copy Stripe's customer names, currency values, or charts as product data.

## Desktop frame

- Design against a 1440–1920 px desktop viewport. Use a white page with a fixed or sticky left navigation rail, about **300 px** wide at the 1920 px reference size. A 218–240 px rail is acceptable at 1440 px if the content keeps the same proportions.
- Place the content area to the right. Give it roughly **50 px** left and right padding at 1920 px, shrinking to 28–36 px at 1440 px. Keep the content left aligned and allow the card grid to use the available width.
- A global top bar spans the content area. Its search field starts at the left, and compact utility icons align right. It is about **72 px** high. The reference has no large colored header or hero graphic.
- A slim full width developer/status bar sits at the bottom of the captured screen. For Match, use this only if it carries real demo or source status; it must not obscure the main content.

## Navigation rail

- White background and a faint `#E6E8ED` right border. The workspace switcher occupies the top 70–80 px with a small square logo, two lines of text, and a downward chevron.
- Primary navigation begins below with icon plus label rows. Approximate row height **38 px**, horizontal padding **26–30 px**, icon size **19–21 px**. Normal text is dark slate; the selected row uses Stripe-like violet text and icon (`#635BFF`) and a slightly heavier weight. The selected row has no filled capsule.
- Separate secondary product links using a small muted section label and at least 26 px vertical space. In Match, use Overview, Cases, Needs review, Activity, and Sources & rules. Avoid adding Stripe-only navigation destinations.
- Keep a small bottom utility area only for an existing Match action such as demo or source information.

## Global controls and typography

- Use a neutral sans font close to Stripe's dashboard appearance: system UI or Inter. Target text color `#30313D`, secondary text `#6B7280`, tertiary text `#87909E`.
- Search is a pale gray rectangular field, roughly **450 px wide × 44 px high**, with a magnifier at the start, `Search` placeholder, subtle `#F7F8FA` fill, and a 7–8 px radius. Focus gets a visible violet outline. In Match, search should filter cases or navigate to them rather than act as a dead control.
- Utility icon buttons are 36–40 px square with 18–20 px line icons, dark slate strokes, and a restrained hover fill. Keep tooltips and accessible labels.
- Main heading is approximately **34 px**, weight 650–700, tight line height. Card headings are **16–18 px**, weight 600. Metric numbers are **25–30 px**, weight 600. Body text is **14–16 px**. Secondary labels and timestamps are **12–14 px**.
- Use an 8 px spacing base. Typical spacing: 8 px between label and value, 16 px between controls, 24 px within cards, 32 px between page sections.

## Overview header

- Show `Your overview` or Match's `Overview` heading near the top left, aligned with the card grid.
- A second row contains compact, outlined, pill-like date controls on the left and `Add` / `Edit` style management actions on the right. For Match, map these to a meaningful date/batch filter and an edit or configure action only if supported; otherwise use existing `Run check again` and `Sources & rules` actions in the same positions.
- Controls use a white surface, 1 px `#D8DEE6` border, 7–9 px radius, 32–36 px height, 12–14 px text. A faint horizontal divider separates this row from the cards.

## Card grid

- Use a **three column grid** at desktop width with 8–12 px gaps. The reference's cards are approximately equal width, about 490 px each at 1920 px, with white backgrounds and very subtle boundaries/shadows. They read as panels within a pale `#F8F9FB` grid region.
- Card corners are approximately 8–10 px. Inner padding is 24–28 px. Card tops align, and rows maintain equal height.
- First row is tall, about **500 px** at the captured viewport. Second row starts immediately beneath it. The visible reference shows Payments, Gross volume, and Net volume in the first row; Failed payments, New customers, and Top customers by spend in the next.
- Match mapping: **Collections checked** (summary or empty state), **Automatically matched** (trend or total), **Needs review** (trend or total), then **Recent exceptions**, **Later evidence**, and **Priority case**. Use real synthetic Match values from the current batch. An unavailable series should show an intentional `No data` state instead of an invented chart.
- Each card has a header label and a small information icon. Add an accessible tooltip defining the metric. Optional compact action icons live in the top right. Keep the number directly under the title before chart or list content.
- Chart cards use thin `#E7EBF0` horizontal gridlines, muted axis labels, and a violet `#9B5CF6` line of about 3 px. Avoid gradients, thick filled areas, or heavy chart axes. The reference's charts have a small timestamp left and a `More details` text link right in the footer.
- List cards use thin row dividers, a bold primary line, muted metadata below, and a small status badge at the right. A `View all` text link sits in the footer. For Match, a recent exception row opens its case, and `View all` opens Cases.
- The reference's empty card has a dashed rectangular outline inset about 24 px, with a centered pale `No data` label. Use the same treatment for a genuinely empty Match metric.

## Page 1: Overview

**Reference:** [Stripe Home overview](https://mobbin.com/screens/fc5d4bcd-1d9a-4cf1-b2f0-cdecac3a1abf). **Match route:** `overview`.

- Preserve the existing `Today` heading and top summary. Structure it as a broad left metric and chart area with a narrower right action panel, following the [Stripe Today layout](https://mobbin.com/screens/d97159b3-dc43-46d4-87af-f0c28cbb2396). The right panel should contain only the open review count, large transaction count, and current batch ID.
- Below that, place `Your overview` and the three column card grid. Row one: Reconciliation, Matched amount, Amount requiring review. Row two: Transactions requiring review, Large transactions, Recent activity.
- The main chart shows collection volume for the synthetic batch. Card charts show actual cumulative values from the current batch. Chart axes and labels must match the selected currency and batch; no decorative fake trend.
- `Run check again` starts the existing batch playback. `View reviews`, card detail links, and case rows go to their corresponding Match views. When the later file changes batch state, all six cards update together.
- Empty review and activity lists use a centered quiet empty state inside a card of unchanged height. Do not hide an empty card and collapse the grid.

## Page 2: Transactions

**Reference:** [Stripe Transactions list](https://mobbin.com/screens/f706524f-2964-47a5-ba06-4fdf75779e0f). **Match route:** `exceptions`.

- Put `Transactions` at the upper left of the content area and compact `Export` and `Run check again` buttons at the upper right. The heading starts about 30 px below the global top bar.
- Below the heading, show a flat tab strip with a thin full width bottom border. `Collections` is selected by default; `Large transactions` includes a count. Selected text is dark and has a 2 px underline, not a filled tab.
- The status filter row sits about 20 px below the tabs. Use individual outlined chips, 34–42 px high, with 8–12 px gaps. The selected chip has a darker 2 px outline. Match filters are All, Matched, Verified, Needs review, Awaiting evidence, and Escalated. The transaction search field aligns right or wraps below at narrower widths.
- Use a full width, borderless table. Header text is 12–13 px muted and medium weight. Rows are about 54–58 px tall with a 1 px lower divider. Columns: selection checkbox, Amount, Status, Collection ID, Reference, Counterparty, and Date. Amount is semibold; IDs and dates are muted. Status uses a compact rectangular badge. At 1440 px, retain Amount, Status, ID, Reference, and Date and move secondary fields to the detail page if needed.
- A row click opens its Transaction detail. Checkbox clicks only select. `Export` downloads the selected rows when selection exists and the filtered set otherwise. Show `1–N of N results` under the table, with disabled pagination controls if all records fit one page.
- For no matches, keep the header and filter row, then show a full width empty result with a `Clear filters` action. Do not render an empty table body without explanation.

## Page 3: Reviews

**Reference:** the [Stripe Transactions filtered state](https://mobbin.com/screens/5ae85682-8a5b-4ae8-adbf-39669ba9f892) as a structural pattern. **Match route:** `review`.

- Reuse the Transactions page geometry exactly: heading, two tabs, status chips, search, table columns, row height, and footer count. This is a filtered work queue, so it must feel like the same product page rather than a new dashboard style.
- Heading is `Reviews`. Tabs are `All reviews` and `Large transactions`. Default rows are the current unresolved or escalated cases. The large tab shows unresolved cases whose amount threshold requires human verification.
- Keep review status text visible. The large transaction notice is a compact, pale information band above the table, not a modal or an oversized warning.
- Clicking a row opens the case detail. When a reviewer records a match, the row leaves the unresolved queue. Escalated and awaiting evidence cases remain visible under the appropriate filter. Preserve active filters when returning from detail where practical.
- Empty queue state says there are no cases requiring review for the selected filters and links back to all transactions.

## Page 4: Transaction detail and investigation

**Reference relationship:** use Stripe's shared navigation, heading, divider, badge, and form styling. The accessible Mobbin results did not establish one verified detail screen for this exact workflow; the structure here is an adaptation of Match's current case view, not a claimed copy of a Stripe detail page. **Match route:** `case`.

- Top left has a small `Transactions` back link. Below it, a large amount and currency sit on one line with status and large amount badges beside them. A `Run investigation` button aligns right. Put the counterparty below in muted text.
- Use a two column content layout: main evidence column about 68–72% width and right details rail about 28–32%, separated by a 24–32 px gutter. Each main section is a flat white surface separated by thin horizontal rules and 32–40 px vertical space.
- Main sections, in order: Recent activity timeline, Payment breakdown, Matching checks, Investigation playback, Source records. Use 16–18 px section headings, 14 px body text, and consistent row labels. Source records use a two column label/value grid rather than colored decorative cards.
- Right rail begins with Details, followed by Review decision, then Customer. Details are compact key/value rows with labels left and values right or below. The decision form uses a native select for ledger posting, a clearly required reason textarea, optional large amount verification checkbox, and a primary action. Put `Escalate` or `Reopen case` as secondary action.
- The decision action is disabled for Analyst role. Show why next to the control, not only as a disabled button. Validation errors identify the missing posting, reason, or verification. On success, update status, timeline, and queue counts without a reload. Keep the demo's `No funds are moved` note beneath the controls.
- Investigation playback should behave as a four step sequence with a visible current step, completed step state, evidence checklist, and close control. Respect reduced motion. Closing playback returns focus to the launch button.
- If a case has no ledger candidate, show a plain `No ledger posting found` state in Payment breakdown and suppress the posting selector. If a case is already matched, replace the form with the recorded decision summary and available reopen control.

## Page 5: Activity

**Reference relationship:** Stripe's neutral dashboard shell, typography, list rows, and fine dividers. This event log is specific to Match. **Match route:** `audit`.

- Heading `Activity` starts at the same content x coordinate and y position as Transactions. Put `Export` at the right. A flat `All events` tab with count sits below.
- A small metadata strip displays `Test environment` and the batch ID. It should look like contextual metadata, not a warning banner.
- Events form a vertical list of 70–90 px rows with a small circular event icon, semibold action name, one line of detail, muted actor and case ID, and a right aligned timestamp. Use fine row dividers. The case ID is a link to its detail.
- Sort newest first. Export downloads the complete currently displayed audit log. An empty log shows a quiet state with the batch ID and no invented events.

## Page 6: Sources & rules

**Reference relationship:** the Stripe shell, tab strip, flat sections, restrained controls, and dense key/value rows. The content is Match specific. **Match route:** `data`.

- Shared header is `Sources & rules` on the left and a small `Test environment` badge on the right. Tabs are `Matching rules`, `Data sources`, and `References`. The selected tab has the same underline and keyboard behavior as Transactions.
- **Matching rules tab:** main column about 70% width, narrow explanatory rail on the right. Sections are Automatic matching, Large transaction verification, and Review settings. Each rule is a row with title, short definition, and an `Enabled` indicator. Thresholds show currency and value aligned right. The right rail explains that settings live in `src/rules.js` and tests validate the policy. This is read only in the UI, so do not style rows as editable toggles.
- **Data sources tab:** two equal file panels for Collection report and Ledger postings. Each shows file title, record count, four preview rows, and a `Download CSV` action. A full width Later ledger file panel below shows its state (`Not received`, `Ready to process`, or `Processed`) and the two actions `Receive sample file` and `Run reconciliation`. Keep `Reset the entire demo` as a subdued text action at the bottom.
- **References tab:** a heading and short statement that all transactions are synthetic, followed by linked documentation rows with title, description, and external link icon. Finish with a quiet field mapping note for payment reference, posting reference, and amount.
- Tab switching changes only the main content, leaving the header, rail, top bar, and active sidebar state stable. Download links should deliver the local sample CSV files. The later file action updates its status and the next reconciliation run updates Overview, Transactions, and Reviews.

## Colors and surfaces

| Token | Approximate value | Use |
| --- | --- | --- |
| `--page` | `#FFFFFF` | Main canvas and navigation |
| `--panel-zone` | `#F8F9FB` | Card grid gutters and subtle background |
| `--border` | `#E4E8EE` | Rail, dividers, buttons, and card edges |
| `--text` | `#30313D` | Headings and values |
| `--muted` | `#697586` | Metadata and axis labels |
| `--accent` | `#635BFF` | Active navigation, links, focus |
| `--chart` | `#9B5CF6` | Data lines |
| `--danger-text` | `#C04466` | Failed or escalated status |
| `--danger-bg` | `#FFF3F6` | Failed or escalated badge |

These values are visual estimates from the Mobbin image. Sample the image and adjust after a side by side browser comparison if pixel fidelity is required.

## Interaction specification

1. **Navigation:** Selecting a rail item updates the route or displayed page and moves the active violet state. Preserve keyboard focus and indicate the current page with `aria-current="page"`.
2. **Search:** Typing filters case IDs, references, and reason text. Enter opens the first matching case. Empty results show a clear message.
3. **Date or batch filter:** Opening the control shows selectable periods or batches. The selected value persists in the control and updates every visible metric together.
4. **Cards:** Only cards with a destination are clickable. On hover, use a slight border or background change; on focus, show a visible outline. Chart hover exposes the point label and value without shifting the layout.
5. **More details / View all:** These open the relevant Match screen with the active filter carried over where possible.
6. **Status:** Use text plus badge color. Never rely on color alone. Loading, empty, error, and populated states should keep card dimensions stable.

## Responsive behavior

- Above 1280 px: three columns and expanded navigation rail.
- From 900 to 1279 px: two card columns; the first card may span both if its content needs room. Keep the navigation rail narrow enough for the main content.
- Below 900 px: replace the left rail with a top navigation or an accessible menu. Cards become one column below roughly 700 px. The search field fills available width, and header actions wrap to the next line.
- Avoid horizontal scrolling in data cards. Long IDs and metadata truncate with a visible full value in a tooltip or detail view.

## Implementation acceptance check

- At a 1920 px viewport, the rail, search bar, heading, controls, and three card columns match the reference's proportions.
- Each Match number agrees with the current batch state, and every visible action has a working destination.
- Keyboard users can reach and operate navigation, filters, search, cards, and links. Focus is visible.
- The 1440 px and mobile layouts have no clipped controls or horizontal page overflow.
- Compare a browser screenshot against the cited Mobbin screen for spacing, card heights, typography, and color, then tune CSS tokens rather than adding one-off offsets.
