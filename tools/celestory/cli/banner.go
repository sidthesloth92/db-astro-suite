package main

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// wordmark is the "CELESTORY" wordmark in the DB Astro Suite box font (the same
// family as the sortronomy wordmark), printed beside the crescent-moon mark.
const wordmark = `╔═╗╔═╗╦  ╔═╗╔═╗╔╦╗╔═╗╦═╗╦ ╦
║  ╠═ ║  ╠═ ╚═╗ ║ ║ ║╠╦╝╚╦╝
╚═╝╚═╝╩══╚═╝╚═╝ ╩ ╚═╝╩╚═ ╩ `

// Moon mark geometry: a big disk minus an offset shadow disk yields the crescent,
// with x compressed to correct for the ~2:1 height-to-width of terminal cells.
const (
	moonRows = 7
	moonCols = 16
	moonDot  = "●"
)

var moon = struct{ cx, cy, r, sx, sy, sr float64 }{cx: 6, cy: 3, r: 3.2, sx: 10.5, sy: 2.2, sr: 3.5}

// Brand gradient endpoints (teal → pink) for the moon dots.
var (
	moonTeal = [3]int{0x34, 0xD3, 0xC4}
	moonPink = [3]int{0xEC, 0x48, 0x99}
)

// Wordmark rows + meta colours: a soft violet gradient with a dimmed copyright/URL.
var (
	bannerRows = []lipgloss.Style{
		lipgloss.NewStyle().Foreground(lipgloss.Color("#C4B5FD")),
		lipgloss.NewStyle().Foreground(lipgloss.Color("#A78BFA")),
		lipgloss.NewStyle().Foreground(lipgloss.Color("#8B5CF6")),
	}
	bannerDim     = lipgloss.NewStyle().Foreground(lipgloss.Color("#6B7280"))
	bannerVersion = lipgloss.NewStyle().Foreground(lipgloss.Color("#8B5CF6"))
)

// displayVersion is the running build's version for the banner, normalising an
// unset/dev build to a readable label.
func displayVersion() string {
	if version == "" || version == "dev" {
		return "dev build"
	}
	return "v" + version
}

// renderMoon builds the crescent-moon mark as a multi-line string, each lit dot
// coloured along the teal→pink brand gradient. lipgloss degrades to plain dots
// on a non-colour terminal.
func renderMoon() string {
	var b strings.Builder
	for y := 0; y < moonRows; y++ {
		for x := 0; x < moonCols; x++ {
			fx := (float64(x) - moon.cx) / 2.0
			fy := float64(y) - moon.cy
			inBig := fx*fx+fy*fy <= moon.r*moon.r
			gx := (float64(x) - moon.sx) / 2.0
			gy := float64(y) - moon.sy
			inShadow := gx*gx+gy*gy <= moon.sr*moon.sr
			if inBig && !inShadow {
				t := 0.7*float64(y)/float64(moonRows-1) + 0.3*float64(x)/float64(moonCols-1)
				b.WriteString(lipgloss.NewStyle().Foreground(moonColor(t)).Render(moonDot))
			} else {
				b.WriteByte(' ')
			}
		}
		if y < moonRows-1 {
			b.WriteByte('\n')
		}
	}
	return b.String()
}

// moonColor linearly interpolates the teal→pink gradient for t in [0,1].
func moonColor(t float64) lipgloss.Color {
	if t < 0 {
		t = 0
	}
	if t > 1 {
		t = 1
	}
	mix := func(a, c int) int { return a + int(float64(c-a)*t) }
	return lipgloss.Color(fmt.Sprintf("#%02X%02X%02X",
		mix(moonTeal[0], moonPink[0]),
		mix(moonTeal[1], moonPink[1]),
		mix(moonTeal[2], moonPink[2]),
	))
}

// printBanner writes the crescent-moon mark with the "CELESTORY" wordmark,
// copyright, and URL beside it, with blank lines for breathing room.
func printBanner() {
	var wm strings.Builder
	for i, row := range strings.Split(wordmark, "\n") {
		wm.WriteString(bannerRows[i%len(bannerRows)].Render(row))
		wm.WriteByte('\n')
	}
	wm.WriteByte('\n')
	wm.WriteString(bannerVersion.Render("celestory " + displayVersion()))
	wm.WriteByte('\n')
	wm.WriteString(bannerDim.Render("© 2026 DB Astro Suite · dbastrosuite.com"))
	wm.WriteByte('\n')
	wm.WriteString(bannerDim.Render("↑ keep current: brew upgrade celestory"))

	side := lipgloss.NewStyle().PaddingLeft(3).Render(wm.String())
	banner := lipgloss.JoinHorizontal(lipgloss.Center, renderMoon(), side)

	fmt.Println()
	fmt.Println(banner)
	fmt.Println()
}
