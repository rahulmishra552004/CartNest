# Computer Networks tutorial solutions

## Concise plain-text notes

The newest version is [computer_networks_short_notes.pdf](computer_networks_short_notes.pdf): **10 A4 pages, exactly two questions per page**, with all 20 answers shortened into ordinary typeset text. Sheet 1 occupies pages 1–5 and Sheet 2 pages 6–10. Worked results, the handshake, encoding waveforms, and subnet addresses are retained. Text is searchable and 20 bookmarks locate the questions.

Reproduce with `PYTHONPATH=/tmp/tutorial_pdf_deps python3 render_short_notes.py`. The editable content is in that script, with an exported copy in `short_notes_source.json`. The layout report is `short_notes_layout.json`. Verified page count, question pairing, text bounds, key results and representative page renders.

## Version matching the supplied reference

The handwriting version is [computer_networks_reference_style_solutions.pdf](computer_networks_reference_style_solutions.pdf), with **26 pages covering all 20 questions**. It uses upright black handwriting, short bullet sections, grey ruled paper, a double margin, punched holes, underlined headings, boxed results and simple diagrams. Superscripts are rendered above the writing baseline. The source explanations and checked calculations are retained from the ruled revision, with the OSI/TCP-IP advantages and limitations condensed into comparison boxes.

The generated background is [reference_assets/blank_notebook_scan.png](reference_assets/blank_notebook_scan.png). It was made with the **built-in image-generation tool**, using the user's `Monochrome Transmission Media Notes.png` as a style reference. The exact [generation prompt](reference_assets/paper_prompt.txt) is saved alongside it. The background is embedded unchanged in the PDF; verified text and diagrams are laid out as a separate transparent handwriting layer. A searchable text layer and 20 question bookmarks are included.

The renderer is `render_reference_pdf.py`. Font licenses are included in `reference_assets/`. The checked layout report and rendered previews are under `/tmp/tutorial_solutions_reference`. Verification confirms all 20 question headings, key numerical answers, and no page-boundary text overflow.

## Ruled revision

`computer_networks_15_page_ruled_solutions.pdf` is the revised version: 15 pages, all 20 questions, shorter explanations, wider line spacing, pale blue notebook rules and a soft red margin. The explanations contain approximately 43% fewer words while retaining the worked calculations, assumptions and requested comparisons.

`solutions_ruled.txt` is its source; `render_ruled_pdf.py` renders it. The writing uses larger glyphs, nonlinear variations in letter shapes, varying word slant and spacing, and local stroke-pressure changes. Paper ruling and ink are skewed together to preserve the scanned appearance. The PDF remains searchable and has page bookmarks. Preview scans and the layout report are in `/tmp/tutorial_solutions_ruled`.

The original denser, unruled version and its source remain available below.

The PDF contains solutions to all ten questions in each of these inputs:

- `C:\Users\rahul\OneDrive\Desktop\CSOE 403 (Tutorial sheet).pdf`
- `C:\Users\rahul\OneDrive\Desktop\Tutorial sheet 2(CN).docx`

The output has exactly 15 A4 pages. The handwriting and scan appearance are digitally rendered. Pages use an unruled paper background, varied handwritten glyphs, modest ink-pressure variation and simple diagrams. An invisible text layer enables searching, and PDF bookmarks locate each question.

Sheet 1 occupies pages 1–9; Sheet 2 occupies pages 10–15. Page 4 combines Sheet 1 Q4 and Q5. Pages 10, 12, 13 and 15 each combine two related Sheet 2 questions.

The text in `solutions.txt` and renderer in `render_pdf.py` reproduce the PDF with Pillow, NumPy and PyMuPDF. The renderer uses the installed Windows Ink Free font. Temporary page scans and the visual layout report are under `/tmp/tutorial_solutions_work`.

## Verification

- Confirmed 15 A4 pages and all 20 question headings in the PDF text layer.
- Checked rendered pages, simple diagrams, and text bounds; no text overflows.
- Independently computed CRC remainder `1110`, codeword `11010110111110`, and the receiver's zero remainder.
- Checked Stop-and-Wait utilization `5 / 45 = 11.1%`.
- Simulated the explicitly stated GBN schedule: 24 data transmissions; SR needs 18 under the stated loss assumptions.
- Computed all four `/26` subnets, their broadcast addresses and usable ranges with Python's IPv4 address library.

## Technical references checked

- [RFC 9293 — Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293.html): TCP header, sequence numbers, acknowledgment and handshake behavior.
- [RFC 5681 — TCP Congestion Control](https://www.rfc-editor.org/info/rfc5681/): classical slow start, congestion avoidance, fast retransmit and fast recovery. The solution explicitly distinguishes this teaching model from other deployed algorithms.
- [RFC 768 — User Datagram Protocol](https://www.rfc-editor.org/info/rfc768/): UDP header and datagram service.
- [Cisco — Troubleshooting Ethernet Collisions](https://www.cisco.com/c/en/us/support/docs/interfaces-modules/port-adapters/12768-eth-collisions.html): shared, half-duplex Ethernet collision behavior.
- [Cornell / S. Keshav — Multiple Access](https://www.cs.cornell.edu/skeshav/book/slides/multiple_access/): ALOHA and shared-medium access concepts.

Calculations, examples and stated scheduling assumptions were worked specifically for the supplied sheets.
