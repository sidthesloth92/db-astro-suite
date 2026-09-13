package cliui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// wordmarkGradient tints successive wordmark rows along the brand's violet
// gradient, cycling if a wordmark has more rows than stops.
var wordmarkGradient = []lipgloss.Style{
	lipgloss.NewStyle().Bold(true).Foreground(ColorValue),
	lipgloss.NewStyle().Bold(true).Foreground(ColorHeading),
	lipgloss.NewStyle().Bold(true).Foreground(ColorBrandDeep),
}

// BannerFooter styles the dimmed copyright/URL lines printed under a wordmark.
var BannerFooter = lipgloss.NewStyle().Foreground(ColorMuted)

// RenderWordmark tints each row of an ASCII wordmark along the brand's violet
// gradient and returns the joined, newline-separated block (no trailing
// newline), so callers control surrounding spacing.
func RenderWordmark(rows []string) string {
	var b strings.Builder
	for i, row := range rows {
		if i > 0 {
			b.WriteByte('\n')
		}
		b.WriteString(wordmarkGradient[i%len(wordmarkGradient)].Render(row))
	}
	return b.String()
}
