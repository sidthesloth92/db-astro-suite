package main

import (
	"strings"
	"testing"
)

func TestPrintLogFooter(t *testing.T) {
	t.Run("names the log, the flag, and the report file", func(t *testing.T) {
		var buf strings.Builder
		printLogFooter(&buf, "/tmp/cachedir/celestory.log")
		out := buf.String()
		for _, want := range []string{"celestory.log", "-report", "celestory-report.log"} {
			if !strings.Contains(out, want) {
				t.Errorf("footer missing %q in:\n%s", want, out)
			}
		}
	})

	t.Run("silent when the log could not be opened", func(t *testing.T) {
		var buf strings.Builder
		printLogFooter(&buf, "")
		if buf.Len() != 0 {
			t.Errorf("expected no output for an empty log path, got:\n%s", buf.String())
		}
	})
}
