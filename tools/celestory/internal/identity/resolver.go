package identity

import "strings"

// Resolved is the canonical identity of an imaged object.
type Resolved struct {
	ID          string   // stable slug, e.g. "m31"
	DisplayName string   // common name if known, else the designation/raw value
	Designation string   // canonical catalog designation, e.g. "M 31"
	Aliases     []string // all known designations for the object
	Type        *string  // fine type (e.g. "Spiral Galaxy"); nil if unresolved
	Category    string   // coarse UI bucket; "Other" if unresolved
}

// Resolve canonicalizes a raw OBJECT header value into a single identity,
// merging cross-catalog aliases (M 31 == NGC 224) via the seed catalog and
// degrading gracefully for anything not in it (never dropped).
func Resolve(rawObject string) Resolved {
	raw := strings.TrimSpace(rawObject)
	if raw == "" {
		return Resolved{
			ID:          "unknown-target",
			DisplayName: "Unknown target",
			Designation: "",
			Aliases:     []string{},
			Category:    CategoryOther,
		}
	}

	if canon, ok := canonicalizeDesignation(raw); ok {
		if e := byDesignation[canon]; e != nil {
			return fromEntry(e)
		}
		// Recognized catalog designation we don't have seeded.
		return Resolved{
			ID:          slug(canon),
			DisplayName: canon,
			Designation: canon,
			Aliases:     []string{canon},
			Category:    categoryForDesignation(canon),
		}
	}

	// Named or freeform target — try the common-name index.
	if e := byName[normalizeName(raw)]; e != nil {
		return fromEntry(e)
	}
	return Resolved{
		ID:          slug(raw),
		DisplayName: raw,
		Designation: raw,
		Aliases:     []string{raw},
		Category:    CategoryOther,
	}
}

// fromEntry builds a Resolved from a seeded catalog entry.
func fromEntry(e *catalogEntry) Resolved {
	display := e.CommonName
	if display == "" {
		display = e.Primary
	}
	var typ *string
	if t := strings.TrimSpace(e.Type); t != "" {
		typ = &t
	}
	aliases := make([]string, len(e.Designations))
	copy(aliases, e.Designations)
	category := e.Category
	if category == "" {
		category = CategoryOther
	}
	return Resolved{
		ID:          e.ID,
		DisplayName: display,
		Designation: e.Primary,
		Aliases:     aliases,
		Type:        typ,
		Category:    category,
	}
}
