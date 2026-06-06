package organize

import (
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/charmbracelet/x/term"
)

const (
	// progressBarWidth is the number of cells in the rendered bar.
	progressBarWidth = 20
	// progressFilled / progressEmpty are the bar's filled and empty cells.
	progressFilled = "█"
	progressEmpty  = "░"
	// ansiClearLine returns the cursor to column 0 and clears to end of line.
	ansiClearLine = "\r\x1b[K"
	// defaultTermWidth is assumed when the real terminal width can't be read.
	defaultTermWidth = 80
)

// progressReporter renders an in-place "[bar] done/total name" line that
// overwrites itself on each update so a large batch collapses to a single
// living line. On a non-terminal writer (piped or redirected output) it stays
// silent, leaving only the surrounding headline and summary, so no carriage
// returns pollute logs.
type progressReporter struct {
	w     io.Writer
	total int
	live  bool
	width int
}

// newProgressReporter builds a reporter for total items writing to w. fd is the
// file descriptor backing w, used to detect a terminal and read its width.
func newProgressReporter(w io.Writer, fd uintptr, total int) *progressReporter {
	p := &progressReporter{w: w, total: total, width: defaultTermWidth}
	if term.IsTerminal(fd) {
		p.live = true
		if cols, _, err := term.GetSize(fd); err == nil && cols > 0 {
			p.width = cols
		}
	}
	return p
}

// update redraws the progress line for the done-th item (1-based) currently
// being processed. No-op on a non-terminal writer.
func (p *progressReporter) update(done int, name string) {
	if !p.live {
		return
	}
	fmt.Fprintf(p.w, "%s%s", ansiClearLine, p.render(done, name))
}

// clear erases the live line so following output (an error, or the final
// summary) starts on a clean row. No-op on a non-terminal writer.
func (p *progressReporter) clear() {
	if !p.live {
		return
	}
	fmt.Fprint(p.w, ansiClearLine)
}

// render builds one progress line, truncating the filename so the whole line
// fits the terminal width.
func (p *progressReporter) render(done int, name string) string {
	frac := float64(done) / float64(p.total)
	if frac > 1 {
		frac = 1
	}
	fill := int(frac * float64(progressBarWidth))
	bar := strings.Repeat(progressFilled, fill) +
		strings.Repeat(progressEmpty, progressBarWidth-fill)

	digits := len(strconv.Itoa(p.total))
	counts := fmt.Sprintf("%*d/%d", digits, done, p.total)

	// Visible columns consumed by everything except the filename:
	//   "  " + bar(progressBarWidth cells) + "  " + counts + "  "
	used := 2 + progressBarWidth + 2 + len(counts) + 2
	avail := p.width - used
	if avail < 1 {
		// Terminal too narrow for a name — show just the bar and counts.
		return fmt.Sprintf("  %s  %s", bar, counts)
	}
	return fmt.Sprintf("  %s  %s  %s", bar, counts, truncateName(name, avail))
}

// truncateName shortens name to at most maxCols display columns, appending an
// ellipsis so the leading (target) portion of long FITS filenames stays
// readable. FITS filenames are ASCII, so one rune is treated as one column.
func truncateName(name string, maxCols int) string {
	r := []rune(name)
	if len(r) <= maxCols {
		return name
	}
	if maxCols <= 1 {
		return string(r[:maxCols])
	}
	return string(r[:maxCols-1]) + "…"
}
