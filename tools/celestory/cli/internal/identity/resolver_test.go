package identity

import "testing"

func TestResolveMergesAliasesToOneObject(t *testing.T) {
	tests := []struct {
		name string
		raw  string
	}{
		{"plain", "M31"},
		{"spaced", "M 31"},
		{"messier word", "Messier 31"},
		{"ngc alias", "NGC224"},
		{"ngc spaced alias", "NGC 224"},
		{"with trailing text", "ngc 224 - andromeda galaxy"},
		{"by common name", "Andromeda Galaxy"},
		{"lowercase", "m 31"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := Resolve(tc.raw)
			if got.ID != "m31" {
				t.Errorf("Resolve(%q).ID = %q, want m31", tc.raw, got.ID)
			}
			if got.Designation != "M 31" {
				t.Errorf("Resolve(%q).Designation = %q, want M 31", tc.raw, got.Designation)
			}
			if got.DisplayName != "Andromeda Galaxy" {
				t.Errorf("Resolve(%q).DisplayName = %q, want Andromeda Galaxy", tc.raw, got.DisplayName)
			}
			if got.Category != CategoryGalaxy {
				t.Errorf("Resolve(%q).Category = %q, want %q", tc.raw, got.Category, CategoryGalaxy)
			}
		})
	}
}

func TestResolveUnseededDesignationKeepsCategoryGuess(t *testing.T) {
	got := Resolve("Sh2-240") // Spaghetti Nebula — not seeded
	if got.Designation != "Sh2-240" {
		t.Errorf("Designation = %q, want Sh2-240", got.Designation)
	}
	if got.ID != "sh2240" {
		t.Errorf("ID = %q, want sh2240", got.ID)
	}
	if got.Category != CategoryNebula {
		t.Errorf("Category = %q, want %q (Sharpless ⇒ Nebula heuristic)", got.Category, CategoryNebula)
	}
	if got.Type != nil {
		t.Errorf("Type = %v, want nil for unseeded object", *got.Type)
	}
}

func TestResolveFreeformAndEmpty(t *testing.T) {
	free := Resolve("My Backyard Test")
	if free.Category != CategoryOther || free.Type != nil {
		t.Errorf("freeform target: got category %q type %v, want Other/nil", free.Category, free.Type)
	}
	if free.DisplayName != "My Backyard Test" {
		t.Errorf("freeform DisplayName = %q, want as-seen", free.DisplayName)
	}

	empty := Resolve("   ")
	if empty.ID != "unknown-target" {
		t.Errorf("empty target ID = %q, want unknown-target", empty.ID)
	}
}

func TestResolveFallsBackToInputFileName(t *testing.T) {
	// An unrecognized designation keeps the (canonicalized) name from the file.
	got := Resolve("NGC 4038") // Antennae — not seeded
	if got.Designation != "NGC 4038" {
		t.Errorf("Designation = %q, want NGC 4038 (from input)", got.Designation)
	}
	if got.DisplayName != "NGC 4038" {
		t.Errorf("DisplayName = %q, want NGC 4038 (from input)", got.DisplayName)
	}

	// A freeform target name is preserved verbatim.
	free := Resolve("Backyard Comet 2026")
	if free.DisplayName != "Backyard Comet 2026" {
		t.Errorf("freeform DisplayName = %q, want input verbatim", free.DisplayName)
	}
}

func TestResolveNewlySeededObjects(t *testing.T) {
	cases := []struct {
		raw, id, category string
	}{
		{"M44", "m44", CategoryOpenCluster},
		{"M 97", "m97", CategoryPlanetaryNebula},
		{"NGC 2632", "m44", CategoryOpenCluster}, // Beehive via NGC alias
		{"M101", "m101", CategoryGalaxy},
		{"Pelican Nebula", "ic5070", CategoryNebula},
	}
	for _, tc := range cases {
		got := Resolve(tc.raw)
		if got.ID != tc.id {
			t.Errorf("Resolve(%q).ID = %q, want %q", tc.raw, got.ID, tc.id)
		}
		if got.Category != tc.category {
			t.Errorf("Resolve(%q).Category = %q, want %q", tc.raw, got.Category, tc.category)
		}
	}
}

func TestResolveTypeAndAliasesForSeeded(t *testing.T) {
	got := Resolve("M 13")
	if got.Type == nil || *got.Type != "Globular Cluster" {
		t.Fatalf("M13 Type = %v, want Globular Cluster", got.Type)
	}
	if got.Category != CategoryGlobularCluster {
		t.Errorf("M13 Category = %q, want %q", got.Category, CategoryGlobularCluster)
	}
	if len(got.Aliases) == 0 {
		t.Errorf("M13 should expose aliases")
	}
}
