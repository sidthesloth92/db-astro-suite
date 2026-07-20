package main

import (
	"bytes"
	"strings"
	"testing"
)

// TestPrintLogFooter verifies the success footer names the log and the
// --report flow, and stays silent when no log file was opened.
func TestPrintLogFooter(t *testing.T) {
	t.Run("should point at the log and the report flag", func(t *testing.T) {
		var buf bytes.Buffer
		printLogFooter(&buf, "/tmp/cache/sortronomy/sortronomy.log")
		out := buf.String()
		for _, want := range []string{"sortronomy.log", "--report", "sortronomy-report.log"} {
			if !strings.Contains(out, want) {
				t.Errorf("footer missing %q:\n%s", want, out)
			}
		}
	})

	t.Run("should print nothing for a discard session", func(t *testing.T) {
		var buf bytes.Buffer
		printLogFooter(&buf, "")
		if buf.Len() != 0 {
			t.Errorf("footer should be empty, got:\n%s", buf.String())
		}
	})
}
