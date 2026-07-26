package identity

import (
	"regexp"
	"strings"
)

// nmSpecRe strips narrowband bandwidth specs ("7nm", "3nm", "35nm") so
// "Ha 7nm" and "7nm Ha" both reduce to the same key.
var nmSpecRe = regexp.MustCompile(`\d+nm`)

// filterKeyRe keeps only lowercase letters and digits for the lookup key.
var filterKeyRe = regexp.MustCompile(`[^a-z0-9α]+`)

// exactFilter maps a normalized key directly to a canonical filter label.
var exactFilter = map[string]string{
	"ha": "Hα", "halpha": "Hα", "hα": "Hα", "hydrogenalpha": "Hα", "hydrogen": "Hα",
	"oiii": "OIII", "o3": "OIII", "oxygen": "OIII", "oxygeniii": "OIII",
	"sii": "SII", "s2": "SII", "sulfur": "SII", "sulphur": "SII", "sulfurii": "SII",
	"nii": "NII", "n2": "NII",
	"l": "L", "lum": "L", "luminance": "L", "lumin": "L",
	"r": "R", "red": "R",
	"g": "G", "green": "G",
	"b": "B", "blue": "B",
	"rgb": "RGB",
}

// NormalizeFilter maps the many spellings of a filter name to a canonical
// label. Unknown filters are returned trimmed (and uppercased if a short
// token) rather than dropped, so dual/tri-band filters like "L-eXtreme" still
// appear. Empty input returns "" (the caller decides OSC handling).
func NormalizeFilter(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	key := strings.ToLower(trimmed)
	key = nmSpecRe.ReplaceAllString(key, "")
	key = filterKeyRe.ReplaceAllString(key, "")
	if c, ok := exactFilter[key]; ok {
		return c
	}
	if strings.Contains(key, "halpha") || key == "hα" {
		return "Hα"
	}
	// Preserve unknown filters as-is; short tokens uppercased (UHC, CLS, UV/IR).
	if len(trimmed) <= 4 {
		return strings.ToUpper(trimmed)
	}
	return trimmed
}
