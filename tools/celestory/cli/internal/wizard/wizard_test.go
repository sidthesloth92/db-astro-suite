package wizard

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDirSuggestionsListsOnlyVisibleSubdirs(t *testing.T) {
	root := t.TempDir()
	for _, d := range []string{"Alpha", "Beta", ".hidden"} {
		if err := os.Mkdir(filepath.Join(root, d), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(filepath.Join(root, "notes.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	got := dirSuggestions(root + string(os.PathSeparator))

	want := map[string]bool{
		filepath.Join(root, "Alpha") + string(os.PathSeparator): true,
		filepath.Join(root, "Beta") + string(os.PathSeparator):  true,
	}
	if len(got) != len(want) {
		t.Fatalf("got %v, want the two visible subdirs %v", got, want)
	}
	for _, s := range got {
		if !want[s] {
			t.Errorf("unexpected suggestion %q (files / hidden dirs must be excluded)", s)
		}
		if !strings.HasSuffix(s, string(os.PathSeparator)) {
			t.Errorf("suggestion %q must end with a separator for chained completion", s)
		}
	}
}

func TestDirSuggestionsFromPartialLeafListsParent(t *testing.T) {
	root := t.TempDir()
	if err := os.Mkdir(filepath.Join(root, "Pictures"), 0o755); err != nil {
		t.Fatal(err)
	}
	// A half-typed leaf ("Pic") resolves to its parent; huh does the prefix
	// filtering, so we just return the parent's subdirs.
	got := dirSuggestions(filepath.Join(root, "Pic"))
	if len(got) != 1 || got[0] != filepath.Join(root, "Pictures")+string(os.PathSeparator) {
		t.Errorf("got %v, want [%s/]", got, filepath.Join(root, "Pictures"))
	}
}

func TestDirSuggestionsUnreadableBaseIsEmpty(t *testing.T) {
	if got := dirSuggestions(filepath.Join(t.TempDir(), "does", "not", "exist") + string(os.PathSeparator)); got != nil {
		t.Errorf("missing base should yield no suggestions, got %v", got)
	}
}
