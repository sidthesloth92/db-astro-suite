package organize

import (
	"strings"
	"testing"
)

func TestProgressRender(t *testing.T) {
	tests := []struct {
		name  string
		total int
		width int
		done  int
		file  string
		want  string
	}{
		{
			name:  "empty bar at start",
			total: 100,
			width: 80,
			done:  0,
			file:  "frame.fit",
			want:  "  ░░░░░░░░░░░░░░░░░░░░  " + "  0/100" + "  frame.fit",
		},
		{
			name:  "half-full bar pads the count to the total's width",
			total: 100,
			width: 80,
			done:  50,
			file:  "frame.fit",
			want:  "  ██████████░░░░░░░░░░  " + " 50/100" + "  frame.fit",
		},
		{
			name:  "full bar at completion",
			total: 4,
			width: 80,
			done:  4,
			file:  "frame.fit",
			want:  "  ████████████████████  " + "4/4" + "  frame.fit",
		},
		{
			name:  "narrow terminal drops the filename",
			total: 100,
			width: 30,
			done:  50,
			file:  "frame.fit",
			want:  "  ██████████░░░░░░░░░░  " + " 50/100",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			p := &progressReporter{total: tc.total, width: tc.width}
			if got := p.render(tc.done, tc.file); got != tc.want {
				t.Errorf("render(%d, %q)\n got: %q\nwant: %q", tc.done, tc.file, got, tc.want)
			}
		})
	}
}

func TestTruncateName(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		maxCols int
		want    string
	}{
		{name: "fits untouched", input: "frame.fit", maxCols: 20, want: "frame.fit"},
		{name: "exact width untouched", input: "frame.fit", maxCols: 9, want: "frame.fit"},
		{name: "too long gets an ellipsis", input: "IC1396_Ha_0124.fit", maxCols: 10, want: "IC1396_Ha…"},
		{name: "single column has no room for ellipsis", input: "frame.fit", maxCols: 1, want: "f"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := truncateName(tc.input, tc.maxCols)
			if got != tc.want {
				t.Errorf("truncateName(%q, %d) = %q, want %q", tc.input, tc.maxCols, got, tc.want)
			}
			if cols := len([]rune(got)); cols > tc.maxCols {
				t.Errorf("truncateName(%q, %d) = %q is %d cols, exceeds max", tc.input, tc.maxCols, got, cols)
			}
		})
	}
}

func TestProgressUpdateSilentWhenNotLive(t *testing.T) {
	var b strings.Builder
	p := &progressReporter{w: &b, total: 10, live: false, width: 80}
	p.update(3, "frame.fit")
	p.clear()
	if b.Len() != 0 {
		t.Errorf("non-live reporter wrote %q, want nothing", b.String())
	}
}
