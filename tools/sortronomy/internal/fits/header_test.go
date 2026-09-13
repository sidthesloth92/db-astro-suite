package fits

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/astrogo/fitsio"
)

// writeFixture creates a minimal dataless FITS file at path whose primary
// header carries typical capture cards plus the given extras. Reading it back
// through fitsio reproduces the decoder's retained-END-card state that
// WriteFilter must cope with.
func writeFixture(t *testing.T, path string, extra ...fitsio.Card) {
	t.Helper()
	cards := append([]fitsio.Card{
		{Name: "IMAGETYP", Value: "Light", Comment: "Type of image"},
		{Name: "INSTRUME", Value: "ZWO ASI533MC Pro", Comment: "Camera model"},
		{Name: "DATE-OBS", Value: "2026-06-28T04:34:29.378751", Comment: "Image exposure start time"},
	}, extra...)

	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("create fixture: %v", err)
	}
	defer f.Close()
	w, err := fitsio.Create(f)
	if err != nil {
		t.Fatalf("create fits: %v", err)
	}
	hdu, err := fitsio.NewPrimaryHDU(fitsio.NewHeader(cards, fitsio.IMAGE_HDU, 8, nil))
	if err != nil {
		t.Fatalf("new primary hdu: %v", err)
	}
	if err := w.Write(hdu); err != nil {
		t.Fatalf("write hdu: %v", err)
	}
	if err := w.Close(); err != nil {
		t.Fatalf("close fits: %v", err)
	}
}

// reopenCard reopens path from disk and returns a copy of the named card, or
// nil if a standards-following reader (which stops at the first END record)
// cannot see it. This is the assertion that catches cards written past END.
func reopenCard(t *testing.T, path, key string) *fitsio.Card {
	t.Helper()
	r, err := os.Open(path)
	if err != nil {
		t.Fatalf("open %s: %v", path, err)
	}
	defer r.Close()
	f, err := fitsio.Open(r)
	if err != nil {
		t.Fatalf("open fits %s: %v", path, err)
	}
	defer f.Close()
	c := f.HDU(0).Header().Get(key)
	if c == nil {
		return nil
	}
	cc := *c
	return &cc
}

func TestWriteFilter(t *testing.T) {
	tests := []struct {
		name       string
		extra      []fitsio.Card
		filterName string
		filterDesc string
		wantDesc   bool
	}{
		{
			name:       "should make FILTER and FILTDESC visible to a fresh open",
			filterName: "Ha",
			filterDesc: "Antlia 3nm Narrowband H-alpha",
			wantDesc:   true,
		},
		{
			name:       "should update an existing FILTER card in place",
			extra:      []fitsio.Card{{Name: "FILTER", Value: "L", Comment: "old"}},
			filterName: "SV220",
			filterDesc: "Svbony SV220 7nm dual-band",
			wantDesc:   true,
		},
		{
			name:       "should omit FILTDESC when the description is blank",
			filterName: "UVIR",
			filterDesc: "",
			wantDesc:   false,
		},
		{
			// A long description must stay inside the FILTDESC card — it must
			// not spill onto an extra COMMENT card (which happens when a card
			// comment doesn't fit on the 80-char line).
			name:       "should keep a long description inside FILTDESC only",
			filterName: "SV220",
			filterDesc: "SV Bony Ha/OIII 3nm duo narrowband filter",
			wantDesc:   true,
		},
		{
			// A name at the validation limit must still leave room for the
			// Sortronomy comment on the same FILTER card.
			name:       "should keep a max-length name's comment on the FILTER card",
			filterName: strings.Repeat("n", MaxFilterNameLen),
			filterDesc: "x",
			wantDesc:   true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "frame.fit")
			writeFixture(t, path, tt.extra...)

			if err := WriteFilter(path, tt.filterName, tt.filterDesc); err != nil {
				t.Fatalf("WriteFilter: %v", err)
			}

			got := reopenCard(t, path, "FILTER")
			if got == nil {
				t.Fatal("FILTER card not visible after reopen")
			}
			if got.Value != tt.filterName {
				t.Errorf("FILTER = %v, want %q", got.Value, tt.filterName)
			}

			desc := reopenCard(t, path, "FILTDESC")
			if tt.wantDesc {
				if desc == nil {
					t.Fatal("FILTDESC card not visible after reopen")
				}
				if desc.Value != tt.filterDesc {
					t.Errorf("FILTDESC = %v, want %q", desc.Value, tt.filterDesc)
				}
			} else if desc != nil {
				t.Errorf("FILTDESC = %v, want absent", desc.Value)
			}

			// The tag must touch FILTER and FILTDESC only — never add
			// COMMENT or HISTORY cards (the fixture contains neither).
			for _, stray := range []string{"COMMENT", "HISTORY"} {
				if c := reopenCard(t, path, stray); c != nil {
					t.Errorf("stray %s card added: %+v", stray, c)
				}
			}

			m, err := ReadMetadata(path)
			if err != nil {
				t.Fatalf("ReadMetadata after tag: %v", err)
			}
			if m.Filter != tt.filterName {
				t.Errorf("ReadMetadata Filter = %q, want %q", m.Filter, tt.filterName)
			}
			if m.FrameType != "Light" || m.Camera == "" {
				t.Errorf("original header cards lost: frameType=%q camera=%q", m.FrameType, m.Camera)
			}
		})
	}
}

func TestWriteFilterRepeatedWrites(t *testing.T) {
	path := filepath.Join(t.TempDir(), "frame.fit")
	writeFixture(t, path)

	if err := WriteFilter(path, "Ha", "first pass"); err != nil {
		t.Fatalf("first WriteFilter: %v", err)
	}
	if err := WriteFilter(path, "OIII", "second pass"); err != nil {
		t.Fatalf("second WriteFilter: %v", err)
	}

	if got := reopenCard(t, path, "FILTER"); got == nil || got.Value != "OIII" {
		t.Fatalf("FILTER after retag = %v, want OIII", got)
	}
	if got := reopenCard(t, path, "FILTDESC"); got == nil || got.Value != "second pass" {
		t.Fatalf("FILTDESC after retag = %v, want %q", got, "second pass")
	}

	// Repeated tagging must not accumulate stray cards either.
	for _, stray := range []string{"COMMENT", "HISTORY"} {
		if c := reopenCard(t, path, stray); c != nil {
			t.Errorf("stray %s card after retag: %+v", stray, c)
		}
	}
}

func TestWriteFilterMaxLengthDescriptionStaysOnOneCard(t *testing.T) {
	path := filepath.Join(t.TempDir(), "frame.fit")
	writeFixture(t, path)

	desc := strings.Repeat("d", MaxFilterDescLen)
	if err := WriteFilter(path, "Ha", desc); err != nil {
		t.Fatalf("WriteFilter: %v", err)
	}

	if got := reopenCard(t, path, "FILTDESC"); got == nil || got.Value != desc {
		t.Fatalf("FILTDESC = %+v, want the %d-char description intact", got, MaxFilterDescLen)
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read tagged file: %v", err)
	}
	if bytes.Contains(raw, []byte("CONTINUE")) {
		t.Error("a max-length description spilled onto CONTINUE cards")
	}
	if bytes.Contains(raw, []byte("COMMENT")) {
		t.Error("a max-length description spilled onto a COMMENT card")
	}
}

func TestValidateFilterName(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{name: "should accept a typical short name", input: "SV220"},
		{name: "should accept a name at the exact limit", input: strings.Repeat("n", MaxFilterNameLen)},
		{name: "should reject a name one over the limit", input: strings.Repeat("n", MaxFilterNameLen+1), wantErr: true},
		{name: "should reject a single quote", input: "O'III", wantErr: true},
		{name: "should reject non-ASCII characters", input: "Hα", wantErr: true},
		{name: "should reject control characters", input: "Ha\tOIII", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateFilterName(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateFilterName(%q) = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
		})
	}
}

func TestValidateFilterDescription(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{name: "should accept a blank description", input: ""},
		{name: "should accept a typical description", input: "SV Bony Ha/OIII 3nm duo narrowband filter"},
		{name: "should accept a description at the exact limit", input: strings.Repeat("d", MaxFilterDescLen)},
		{name: "should reject a description one over the limit", input: strings.Repeat("d", MaxFilterDescLen+1), wantErr: true},
		{name: "should reject a single quote", input: "Antlia 3nm 'gold' edition", wantErr: true},
		{name: "should reject non-ASCII characters", input: "3nm — narrowband", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateFilterDescription(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateFilterDescription(%q) = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
		})
	}
}
