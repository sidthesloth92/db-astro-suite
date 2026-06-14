package main

import (
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/x/term"
)

const (
	// progressBarWidth is the number of cells in the rendered bar.
	progressBarWidth = 24
	// progressFilled / progressEmpty are the bar's filled and empty cells.
	progressFilled = "█"
	progressEmpty  = "░"
	// ansiClearLine returns the cursor to column 0 and clears to end of line.
	ansiClearLine = "\r\x1b[K"
	// progressThrottle caps redraw frequency so a huge library doesn't thrash
	// the terminal; the final (done == total) frame always renders.
	progressThrottle = 80 * time.Millisecond
)

// Bar colours: a violet fill matching the wordmark, a dim trough, dim text.
var (
	progressFillStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("#A78BFA"))
	progressTroughStyle = lipgloss.NewStyle().Foreground(lipgloss.Color("#3F3F5A"))
	progressTextStyle  = lipgloss.NewStyle().Foreground(lipgloss.Color("#9CA3AF"))
)

// progressReporter renders an in-place "[bar] pct done/total files" line that
// overwrites itself as files are scanned, collapsing a large batch to one
// living line. On a non-terminal writer (piped/redirected) it stays silent so
// no carriage returns pollute logs.
type progressReporter struct {
	w    io.Writer
	live bool
	last time.Time
}

// newProgressReporter builds a reporter writing to w; fd is the file descriptor
// backing w, used to detect whether it is an interactive terminal.
func newProgressReporter(w io.Writer, fd uintptr) *progressReporter {
	return &progressReporter{w: w, live: term.IsTerminal(fd)}
}

// update redraws the progress line for done of total files. No-op on a
// non-terminal writer; throttled except for the final frame.
func (p *progressReporter) update(done, total int) {
	if !p.live || total <= 0 {
		return
	}
	now := time.Now()
	if done < total && now.Sub(p.last) < progressThrottle {
		return
	}
	p.last = now
	fmt.Fprintf(p.w, "%s%s", ansiClearLine, p.render(done, total))
}

// clear erases the live line so the following summary starts on a clean row.
func (p *progressReporter) clear() {
	if !p.live {
		return
	}
	fmt.Fprint(p.w, ansiClearLine)
}

func (p *progressReporter) render(done, total int) string {
	frac := float64(done) / float64(total)
	if frac > 1 {
		frac = 1
	}
	fill := int(frac * float64(progressBarWidth))
	bar := progressFillStyle.Render(strings.Repeat(progressFilled, fill)) +
		progressTroughStyle.Render(strings.Repeat(progressEmpty, progressBarWidth-fill))

	digits := len(strconv.Itoa(total))
	pct := fmt.Sprintf("%3d%%", int(frac*100))
	counts := fmt.Sprintf("%*d/%d files", digits, done, total)
	return fmt.Sprintf("  %s  %s  %s", bar, progressTextStyle.Render(pct), progressTextStyle.Render(counts))
}
