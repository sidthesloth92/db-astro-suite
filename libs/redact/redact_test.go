package redact

import (
	"bytes"
	"io/fs"
	"log/slog"
	"os"
	"strings"
	"testing"
)

func TestHomeMaskerMask(t *testing.T) {
	tests := []struct {
		name            string
		home            string
		caseInsensitive bool
		in              string
		want            string
	}{
		{
			name: "home path exactly becomes tilde",
			home: "/Users/jane",
			in:   "/Users/jane",
			want: "~",
		},
		{
			name: "nested path under home",
			home: "/Users/jane",
			in:   "/Users/jane/Astro/2026-06-01/M31/Light_M31_120s.fits",
			want: "~/Astro/2026-06-01/M31/Light_M31_120s.fits",
		},
		{
			name: "non-home path untouched",
			home: "/Users/jane",
			in:   "/Volumes/T7/Organized/M31/Light.fits",
			want: "/Volumes/T7/Organized/M31/Light.fits",
		},
		{
			name: "path embedded inside an error string",
			home: "/home/jane",
			in:   "open /home/jane/raw/x.fit: permission denied",
			want: "open ~/raw/x.fit: permission denied",
		},
		{
			name: "key=value attr is masked after the equals sign",
			home: "/Users/jane",
			in:   "file=/Users/jane/raw/x.fit",
			want: "file=~/raw/x.fit",
		},
		{
			name: "multiple occurrences all masked",
			home: "/Users/jane",
			in:   "copy /Users/jane/a.fit -> /Users/jane/out/a.fit",
			want: "copy ~/a.fit -> ~/out/a.fit",
		},
		{
			name: "sibling directory with home as prefix is not mangled",
			home: "/Users/jane",
			in:   "/Users/jane2/Astro/x.fit",
			want: "/Users/jane2/Astro/x.fit",
		},
		{
			name: "home string embedded in a clone/backup tree is left alone",
			home: "/Users/jane",
			in:   "dst=/Volumes/Clone/Users/jane/M31/x.fit",
			want: "dst=/Volumes/Clone/Users/jane/M31/x.fit",
		},
		{
			name: "genuine occurrence still masked when a clone path precedes it",
			home: "/Users/jane",
			in:   "copy /Volumes/Clone/Users/jane/a.fit -> /Users/jane/a.fit",
			want: "copy /Volumes/Clone/Users/jane/a.fit -> ~/a.fit",
		},
		{
			name: "quoted path is masked inside the quotes",
			home: "/Users/jane",
			in:   `stat "/Users/jane/raw": no such file`,
			want: `stat "~/raw": no such file`,
		},
		{
			name:            "case-variant spelling masked when fold is on (macOS/Windows)",
			home:            "/Users/jane",
			caseInsensitive: true,
			in:              "open /users/jane/raw/x.fit: permission denied",
			want:            "open ~/raw/x.fit: permission denied",
		},
		{
			name:            "windows path with different case",
			home:            `C:\Users\Jane`,
			caseInsensitive: true,
			in:              `open c:\users\jane\raw\x.fit: access denied`,
			want:            `open ~\raw\x.fit: access denied`,
		},
		{
			name:            "windows forward-slash variant",
			home:            `C:\Users\Jane`,
			caseInsensitive: true,
			in:              `C:/Users/Jane/raw/x.fit`,
			want:            `~/raw/x.fit`,
		},
		{
			name:            "fold off keeps matching case-sensitive",
			home:            "/Users/jane",
			caseInsensitive: false,
			in:              "/Users/Jane/raw/x.fit",
			want:            "/Users/Jane/raw/x.fit",
		},
		{
			name: "trailing separator on home is ignored",
			home: "/Users/jane/",
			in:   "/Users/jane/raw/x.fit",
			want: "~/raw/x.fit",
		},
		{
			name: "empty home masks nothing",
			home: "",
			in:   "/Users/jane/raw/x.fit",
			want: "/Users/jane/raw/x.fit",
		},
		{
			name: "empty input stays empty",
			home: "/Users/jane",
			in:   "",
			want: "",
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := NewHomeMasker(tc.home, tc.caseInsensitive).Mask(tc.in)
			if got != tc.want {
				t.Errorf("Mask(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}

func TestSystemMaskerMasksTheRealHome(t *testing.T) {
	home, err := os.UserHomeDir()
	if err != nil {
		t.Skipf("no home dir available: %v", err)
	}
	m, ok := SystemMasker()
	if !ok {
		t.Fatal("SystemMasker not ok despite an available home dir")
	}
	if got := m.Mask(home + "/raw/x.fit"); got != "~/raw/x.fit" {
		t.Errorf("Mask(home path) = %q, want %q", got, "~/raw/x.fit")
	}
}

func TestReplaceAttrMasksStringsAndErrors(t *testing.T) {
	m := NewHomeMasker("/Users/jane", false)

	var buf bytes.Buffer
	log := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{ReplaceAttr: m.ReplaceAttr}))
	pathErr := &fs.PathError{Op: "open", Path: "/Users/jane/raw/x.fit", Err: fs.ErrPermission}
	log.Error("copy failed", "file", "/Users/jane/raw/x.fit", "count", 3, "err", pathErr)

	out := buf.String()
	if strings.Contains(out, "/Users/jane") {
		t.Errorf("output leaks the home directory:\n%s", out)
	}
	for _, want := range []string{"~/raw/x.fit", "count=3", "permission denied"} {
		if !strings.Contains(out, want) {
			t.Errorf("output missing %q:\n%s", want, out)
		}
	}
}

func TestReplaceAttrMasksTheMessage(t *testing.T) {
	m := NewHomeMasker("/Users/jane", false)

	var buf bytes.Buffer
	log := slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{ReplaceAttr: m.ReplaceAttr}))
	log.Info("scanning /Users/jane/raw")

	out := buf.String()
	if strings.Contains(out, "/Users/jane") {
		t.Errorf("message leaks the home directory:\n%s", out)
	}
	if !strings.Contains(out, "scanning ~/raw") {
		t.Errorf("message not masked:\n%s", out)
	}
}
