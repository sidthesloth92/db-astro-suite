// Package identity canonicalizes the messy, cross-program values found in FITS
// headers into stable identities: it resolves an OBJECT string to a single
// catalog target (merging aliases like M 31 == NGC 224), classifies it into a
// coarse UI category, and normalizes filter names (Hα, OIII, …).
package identity

import (
	_ "embed"
	"encoding/json"
	"regexp"
	"strings"
)

//go:embed data/catalog.json
var catalogJSON []byte

// catalogEntry is one seed catalog record (id, common name, designations,
// type, category). Loaded from the embedded data/catalog.json.
type catalogEntry struct {
	ID           string   `json:"id"`
	CommonName   string   `json:"commonName"`
	Primary      string   `json:"primary"`
	Type         string   `json:"type"`
	Category     string   `json:"category"`
	Designations []string `json:"designations"`
	AltNames     []string `json:"altNames"`
	RA           *float64 `json:"ra,omitempty"`  // J2000 right ascension, decimal degrees
	Dec          *float64 `json:"dec,omitempty"` // J2000 declination, decimal degrees
}

var (
	byDesignation = map[string]*catalogEntry{}
	byName        = map[string]*catalogEntry{}
)

func init() {
	var entries []catalogEntry
	if err := json.Unmarshal(catalogJSON, &entries); err != nil {
		// The catalog is embedded at build time; a parse failure is a
		// programming error, not a runtime condition. Resolution degrades to
		// designation-only canonicalization rather than panicking.
		return
	}
	for i := range entries {
		e := &entries[i]
		for _, d := range e.Designations {
			if canon, ok := canonicalizeDesignation(d); ok {
				byDesignation[canon] = e
			}
		}
		if n := normalizeName(e.CommonName); n != "" {
			byName[n] = e
		}
		for _, alt := range e.AltNames {
			if n := normalizeName(alt); n != "" {
				byName[n] = e
			}
		}
	}
}

// designationRe matches a leading catalog token. Longer prefixes precede the
// single-letter ones so "messier" wins over "m". Leading zeros are dropped.
var designationRe = regexp.MustCompile(`(?i)^\s*(messier|sharpless|caldwell|barnard|abell|ngc|ic|sh2|sh|lbn|ldn|pgc|ugc|vdb|m|c|b)\s*[-_ ]?\s*0*(\d+)\s*([a-z]?)`)

// prefixCanon maps a recognized prefix (lowercased) to its canonical form and
// the separator placed before the number.
var prefixCanon = map[string][2]string{
	"messier": {"M", " "}, "m": {"M", " "},
	"ngc":       {"NGC", " "},
	"ic":        {"IC", " "},
	"sharpless": {"Sh2", "-"}, "sh2": {"Sh2", "-"}, "sh": {"Sh2", "-"},
	"caldwell": {"C", " "}, "c": {"C", " "},
	"barnard": {"B", " "}, "b": {"B", " "},
	"abell": {"Abell", " "},
	"lbn":   {"LBN", " "},
	"ldn":   {"LDN", " "},
	"pgc":   {"PGC", " "},
	"ugc":   {"UGC", " "},
	"vdb":   {"vdB", " "},
}

// canonicalizeDesignation extracts and normalizes a catalog designation from a
// raw OBJECT value, ignoring trailing descriptive text. "m31", "M 31",
// "ngc 224 - andromeda" → ("M 31"/"NGC 224", true). Returns false when no
// catalog token is present (named or freeform target).
func canonicalizeDesignation(raw string) (string, bool) {
	m := designationRe.FindStringSubmatch(strings.TrimSpace(raw))
	if m == nil {
		return "", false
	}
	pc, ok := prefixCanon[strings.ToLower(m[1])]
	if !ok {
		return "", false
	}
	canon := pc[0] + pc[1] + m[2]
	if m[3] != "" {
		canon += strings.ToUpper(m[3])
	}
	return canon, true
}

var nameStripRe = regexp.MustCompile(`[^a-z0-9]+`)

// normalizeName lowercases a common name and strips non-alphanumerics for
// lookup. "Andromeda Galaxy" → "andromedagalaxy".
func normalizeName(s string) string {
	return nameStripRe.ReplaceAllString(strings.ToLower(strings.TrimSpace(s)), "")
}

// slug builds a compact id from a designation or name: lowercase, alphanumerics
// only. "M 31" → "m31", "NGC 224" → "ngc224".
func slug(s string) string {
	return nameStripRe.ReplaceAllString(strings.ToLower(strings.TrimSpace(s)), "")
}
