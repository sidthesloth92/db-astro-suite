package cliui

import (
	"fmt"

	"github.com/charmbracelet/lipgloss"
)

// Common semantic styles built from the brand palette. Heading/Value/OK/Warn/
// Fail are bold; Dim is plain grey for secondary text. lipgloss styles are
// immutable — callers can derive variants (e.g. OK.Underline(true)) without
// mutating these shared values.
var (
	Heading = lipgloss.NewStyle().Bold(true).Foreground(ColorHeading)
	Value   = lipgloss.NewStyle().Bold(true).Foreground(ColorValue)
	OK      = lipgloss.NewStyle().Bold(true).Foreground(ColorOK)
	Warn    = lipgloss.NewStyle().Bold(true).Foreground(ColorWarn)
	Fail    = lipgloss.NewStyle().Bold(true).Foreground(ColorFail)
	Dim     = lipgloss.NewStyle().Foreground(ColorDim)
)

// Count renders a "<label> <n>" fragment, highlighting it with active only when
// n > 0 so a clean run's zero counts stay quiet and the eye is drawn to real
// problems (skips, failures).
func Count(label string, n int, active lipgloss.Style) string {
	text := fmt.Sprintf("%s %d", label, n)
	if n > 0 {
		return active.Render(text)
	}
	return Dim.Render(text)
}
